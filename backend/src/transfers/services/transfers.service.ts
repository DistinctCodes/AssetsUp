// src/transfers/services/transfer.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import {
  Transfer,
  TransferStatus,
  TransferType,
} from '../entities/transfer.entity';
import { Asset } from '../../assets/entities/asset.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
// import { Location } from '../../locations/entities/location.entity';
import { AssetHistoryService } from '../../assets/services/asset-history.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ApproveTransferDto } from '../dto/approve-transfer.dto';
import { CreateTransferDto } from '../dto/create-transfer.dto';
import { QueryTransfersDto } from '../dto/query-transfers.dto';
import { RejectTransferDto } from '../dto/reject-transfer.dto';
import { ApprovalRuleService } from './approval-rule.service';
import { TransferLockService } from './transfer-lock.service';

@Injectable()
export class TransferService {
  constructor(
    @InjectRepository(Transfer)
    private transferRepository: Repository<Transfer>,
    @InjectRepository(Asset)
    private assetRepository: Repository<Asset>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    private dataSource: DataSource,
    private approvalRuleService: ApprovalRuleService,
    private transferLockService: TransferLockService,
    private assetHistoryService: AssetHistoryService,
    private eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(
    createTransferDto: CreateTransferDto,
    userId: string,
  ): Promise<Transfer> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate user exists
      const requestedBy = await this.userRepository.findOne({
        where: { id: userId },
      });
      if (!requestedBy) {
        throw new NotFoundException('User not found');
      }

      // Validate assets
      const assets = await this.assetRepository.find({
        where: { id: In(createTransferDto.assetIds) },
        relations: ['category', 'assignedUser', 'department', 'location'],
      });

      if (assets.length !== createTransferDto.assetIds.length) {
        throw new NotFoundException('One or more assets not found');
      }

      // Check for RETIRED assets
      const retiredAssets = assets.filter(
        (asset) => asset.status === 'RETIRED',
      );
      if (retiredAssets.length > 0) {
        throw new BadRequestException('Cannot transfer RETIRED assets');
      }

      // Check if assets are locked in other transfers
      const lockedAssets = await this.transferLockService.checkAssetsLocked(
        createTransferDto.assetIds,
      );
      if (lockedAssets.length > 0) {
        throw new BadRequestException(
          `Assets are locked in another pending transfer: ${lockedAssets.join(', ')}`,
        );
      }

      // Validate entities based on transfer type
      await this.validateTransferEntities(createTransferDto);

      // Check for same source and destination
      this.validateNotSameDestination(createTransferDto);

      // Create transfer
      const transfer = this.transferRepository.create({
        transferType: createTransferDto.transferType,
        assets,
        reason: createTransferDto.reason,
        notes: createTransferDto.notes,
        requestedBy,
        scheduledDate: createTransferDto.scheduledDate
          ? new Date(createTransferDto.scheduledDate)
          : null,
      });

      // Set from/to entities
      await this.setTransferEntities(transfer, createTransferDto);

      // Evaluate approval rules
      const approvalRequired =
        await this.approvalRuleService.evaluateRules(transfer);
      transfer.approvalRequired = approvalRequired;

      if (!approvalRequired) {
        transfer.status = TransferStatus.APPROVED;
      }

      // Lock assets
      await this.transferLockService.lockAssets(
        createTransferDto.assetIds,
        transfer.id,
      );

      // Save transfer
      const savedTransfer = await queryRunner.manager.save(transfer);

      await queryRunner.commitTransaction();

      // Emit events
      if (approvalRequired) {
        this.eventEmitter.emit('transfer.approval-required', savedTransfer);
      } else {
        this.eventEmitter.emit('transfer.auto-approved', savedTransfer);
        // Auto-execute if no scheduled date
        if (!savedTransfer.scheduledDate) {
          await this.executeTransfer(savedTransfer.id, userId);
        }
      }

      return this.findOne(savedTransfer.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    query: QueryTransfersDto,
  ): Promise<{ data: Transfer[]; total: number }> {
    const qb = this.transferRepository
      .createQueryBuilder('transfer')
      .leftJoinAndSelect('transfer.assets', 'assets')
      .leftJoinAndSelect('transfer.requestedBy', 'requestedBy')
      .leftJoinAndSelect('transfer.approvedBy', 'approvedBy')
      .leftJoinAndSelect('transfer.fromUser', 'fromUser')
      .leftJoinAndSelect('transfer.toUser', 'toUser')
      .leftJoinAndSelect('transfer.fromDepartment', 'fromDepartment')
      .leftJoinAndSelect('transfer.toDepartment', 'toDepartment')
      .leftJoinAndSelect('transfer.fromLocation', 'fromLocation')
      .leftJoinAndSelect('transfer.toLocation', 'toLocation');

    if (query.status) {
      qb.andWhere('transfer.status = :status', { status: query.status });
    }

    if (query.transferType) {
      qb.andWhere('transfer.transferType = :transferType', {
        transferType: query.transferType,
      });
    }

    if (query.requestedBy) {
      qb.andWhere('transfer.requestedBy.id = :requestedBy', {
        requestedBy: query.requestedBy,
      });
    }

    if (query.fromDate) {
      qb.andWhere('transfer.createdAt >= :fromDate', {
        fromDate: query.fromDate,
      });
    }

    if (query.toDate) {
      qb.andWhere('transfer.createdAt <= :toDate', { toDate: query.toDate });
    }

    const page = query.page || 1;
    const limit = query.limit || 20;

    qb.skip((page - 1) * limit)
      .take(limit)
      .orderBy('transfer.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Transfer> {
    const transfer = await this.transferRepository.findOne({
      where: { id },
      relations: [
        'assets',
        'assets.category',
        'requestedBy',
        'approvedBy',
        'rejectedBy',
        'fromUser',
        'toUser',
        'fromDepartment',
        'toDepartment',
        'fromLocation',
        'toLocation',
      ],
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    return transfer;
  }

  async approve(
    id: string,
    userId: string,
    dto: ApproveTransferDto,
  ): Promise<Transfer> {
    const transfer = await this.findOne(id);

    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Transfer is not in pending status');
    }

    if (transfer.requestedBy.id === userId) {
      throw new ForbiddenException('Cannot approve your own transfer request');
    }

    const approver = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!approver) {
      throw new NotFoundException('Approver not found');
    }

    transfer.status = TransferStatus.APPROVED;
    transfer.approvedBy = approver;
    if (dto.notes) {
      transfer.notes = transfer.notes
        ? `${transfer.notes}\n${dto.notes}`
        : dto.notes;
    }

    await this.transferRepository.save(transfer);

    this.eventEmitter.emit('transfer.approved', transfer);

    // Auto-execute if no scheduled date
    if (!transfer.scheduledDate) {
      await this.executeTransfer(transfer.id, userId);
    }

    return this.findOne(id);
  }

  async reject(
    id: string,
    userId: string,
    dto: RejectTransferDto,
  ): Promise<Transfer> {
    const transfer = await this.findOne(id);

    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Transfer is not in pending status');
    }

    if (transfer.requestedBy.id === userId) {
      throw new ForbiddenException('Cannot reject your own transfer request');
    }

    const rejector = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!rejector) {
      throw new NotFoundException('Rejector not found');
    }

    transfer.status = TransferStatus.REJECTED;
    transfer.rejectedBy = rejector;
    transfer.rejectionReason = dto.rejectionReason;

    await this.transferRepository.save(transfer);

    // Unlock assets
    await this.transferLockService.unlockAssets(
      transfer.assets.map((a) => a.id),
    );

    this.eventEmitter.emit('transfer.rejected', transfer);

    return this.findOne(id);
  }

  async cancel(id: string, userId: string): Promise<Transfer> {
    const transfer = await this.findOne(id);

    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Only pending transfers can be cancelled');
    }

    if (transfer.requestedBy.id !== userId) {
      throw new ForbiddenException(
        'Only the requester can cancel the transfer',
      );
    }

    transfer.status = TransferStatus.CANCELLED;
    await this.transferRepository.save(transfer);

    // Unlock assets
    await this.transferLockService.unlockAssets(
      transfer.assets.map((a) => a.id),
    );

    this.eventEmitter.emit('transfer.cancelled', transfer);

    return this.findOne(id);
  }

  async executeTransfer(id: string, userId: string): Promise<Transfer> {
    // Implement idempotency check
    const lockKey = `transfer:execute:${id}`;
    const locked = await this.cacheManager.get(lockKey);
    if (locked) {
      throw new BadRequestException('Transfer execution already in progress');
    }

    await this.cacheManager.set(lockKey, true, 300000); // 5 minutes

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const transfer = await this.findOne(id);

      if (transfer.status === TransferStatus.COMPLETED) {
        return transfer; // Idempotent
      }

      if (transfer.status !== TransferStatus.APPROVED) {
        throw new BadRequestException(
          'Transfer must be approved before execution',
        );
      }

      // Update assets with pessimistic locking
      for (const asset of transfer.assets) {
        const lockedAsset = await queryRunner.manager.findOne(Asset, {
          where: { id: asset.id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!lockedAsset) {
          throw new NotFoundException(`Asset ${asset.id} not found`);
        }

        // Update asset based on transfer type
        if (
          transfer.transferType === TransferType.USER ||
          transfer.transferType === TransferType.COMPLETE
        ) {
          lockedAsset.assignedUser = transfer.toUser;
        }

        if (
          transfer.transferType === TransferType.DEPARTMENT ||
          transfer.transferType === TransferType.COMPLETE
        ) {
          lockedAsset.department = transfer.toDepartment;
        }

        if (
          transfer.transferType === TransferType.LOCATION ||
          transfer.transferType === TransferType.COMPLETE
        ) {
          lockedAsset.location = transfer.toLocation;
        }

        await queryRunner.manager.save(lockedAsset);

        // Create asset history entry
        await this.assetHistoryService.createHistory({
          asset: lockedAsset,
          action: 'TRANSFERRED',
          performedBy: await this.userRepository.findOne({
            where: { id: userId },
          }),
          details: `Transfer #${transfer.id}: ${transfer.reason}`,
          fromUser: transfer.fromUser,
          toUser: transfer.toUser,
          fromDepartment: transfer.fromDepartment,
          toDepartment: transfer.toDepartment,
          fromLocation: transfer.fromLocation,
          toLocation: transfer.toLocation,
        });
      }

      transfer.status = TransferStatus.COMPLETED;
      transfer.completedAt = new Date();
      await queryRunner.manager.save(transfer);

      await queryRunner.commitTransaction();

      // Unlock assets
      await this.transferLockService.unlockAssets(
        transfer.assets.map((a) => a.id),
      );

      this.eventEmitter.emit('transfer.completed', transfer);

      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
      await this.cacheManager.del(lockKey);
    }
  }

  async undoTransfer(id: string, userId: string): Promise<Transfer> {
    const transfer = await this.findOne(id);

    if (transfer.status !== TransferStatus.COMPLETED) {
      throw new BadRequestException('Only completed transfers can be undone');
    }

    const undoTimeLimit = 24 * 60 * 60 * 1000; // 24 hours
    const timeSinceCompletion = Date.now() - transfer.completedAt.getTime();

    if (timeSinceCompletion > undoTimeLimit) {
      throw new BadRequestException('Undo time limit exceeded (24 hours)');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Revert assets
      for (const asset of transfer.assets) {
        const lockedAsset = await queryRunner.manager.findOne(Asset, {
          where: { id: asset.id },
          lock: { mode: 'pessimistic_write' },
        });

        if (
          transfer.transferType === TransferType.USER ||
          transfer.transferType === TransferType.COMPLETE
        ) {
          lockedAsset.assignedUser = transfer.fromUser;
        }

        if (
          transfer.transferType === TransferType.DEPARTMENT ||
          transfer.transferType === TransferType.COMPLETE
        ) {
          lockedAsset.department = transfer.fromDepartment;
        }

        if (
          transfer.transferType === TransferType.LOCATION ||
          transfer.transferType === TransferType.COMPLETE
        ) {
          lockedAsset.location = transfer.fromLocation;
        }

        await queryRunner.manager.save(lockedAsset);

        // Create history entry
        await this.assetHistoryService.createHistory({
          asset: lockedAsset,
          action: 'TRANSFER_UNDONE',
          performedBy: await this.userRepository.findOne({
            where: { id: userId },
          }),
          details: `Undone transfer #${transfer.id}`,
        });
      }

      transfer.status = TransferStatus.CANCELLED;
      transfer.notes = `${transfer.notes || ''}\nUndone by user on ${new Date().toISOString()}`;
      await queryRunner.manager.save(transfer);

      await queryRunner.commitTransaction();

      this.eventEmitter.emit('transfer.undone', transfer);

      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getPendingApprovals(userId: string): Promise<Transfer[]> {
    // Get user's roles
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find transfers pending approval where user has approver role
    const transfers = await this.transferRepository.find({
      where: {
        status: TransferStatus.PENDING,
        approvalRequired: true,
      },
      relations: [
        'assets',
        'requestedBy',
        'fromUser',
        'toUser',
        'fromDepartment',
        'toDepartment',
        'fromLocation',
        'toLocation',
      ],
    });

    // Filter based on approval rules
    const pendingForUser = [];
    for (const transfer of transfers) {
      const rules = await this.approvalRuleService.getMatchingRules(transfer);
      const canApprove = rules.some(
        (rule) =>
          user.roles.some((role) => role.id === rule.approverRole.id) ||
          (rule.approverUser && rule.approverUser.id === userId),
      );

      if (canApprove) {
        pendingForUser.push(transfer);
      }
    }

    return pendingForUser;
  }

  private async validateTransferEntities(
    dto: CreateTransferDto,
  ): Promise<void> {
    if (dto.toUserId) {
      const user = await this.userRepository.findOne({
        where: { id: dto.toUserId },
      });
      if (!user) {
        throw new NotFoundException('Destination user not found');
      }
    }

    if (dto.toDepartmentId) {
      const dept = await this.departmentRepository.findOne({
        where: { id: dto.toDepartmentId },
      });
      if (!dept) {
        throw new NotFoundException('Destination department not found');
      }
    }

    if (dto.toLocationId) {
      const loc = await this.locationRepository.findOne({
        where: { id: dto.toLocationId },
      });
      if (!loc) {
        throw new NotFoundException('Destination location not found');
      }
    }
  }

  private validateNotSameDestination(dto: CreateTransferDto): void {
    if (dto.fromUserId && dto.toUserId && dto.fromUserId === dto.toUserId) {
      throw new BadRequestException('Cannot transfer to same user');
    }

    if (
      dto.fromDepartmentId &&
      dto.toDepartmentId &&
      dto.fromDepartmentId === dto.toDepartmentId
    ) {
      throw new BadRequestException('Cannot transfer to same department');
    }

    if (
      dto.fromLocationId &&
      dto.toLocationId &&
      dto.fromLocationId === dto.toLocationId
    ) {
      throw new BadRequestException('Cannot transfer to same location');
    }
  }

  private async setTransferEntities(
    transfer: Transfer,
    dto: CreateTransferDto,
  ): Promise<void> {
    if (dto.fromUserId) {
      transfer.fromUser = await this.userRepository.findOne({
        where: { id: dto.fromUserId },
      });
    }
    if (dto.toUserId) {
      transfer.toUser = await this.userRepository.findOne({
        where: { id: dto.toUserId },
      });
    }
    if (dto.fromDepartmentId) {
      transfer.fromDepartment = await this.departmentRepository.findOne({
        where: { id: dto.fromDepartmentId },
      });
    }
    if (dto.toDepartmentId) {
      transfer.toDepartment = await this.departmentRepository.findOne({
        where: { id: dto.toDepartmentId },
      });
    }
    if (dto.fromLocationId) {
      transfer.fromLocation = await this.locationRepository.findOne({
        where: { id: dto.fromLocationId },
      });
    }
    if (dto.toLocationId) {
      transfer.toLocation = await this.locationRepository.findOne({
        where: { id: dto.toLocationId },
      });
    }
  }
}
