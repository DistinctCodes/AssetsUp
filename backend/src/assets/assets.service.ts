import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Asset, ASSET_DETAIL_RELATIONS } from './entities/asset.entity';
import { AssetLifecycleService, AssetStatus } from './asset-lifecycle.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AssetHistoryService } from './asset-history.service';
import { AssetHistoryAction } from './entities/asset-history-event.entity';
import { Department } from '../departments/entities/department.entity';
import { User } from '../users/entities/user.entity';
import { BulkStatusDto } from './dto/bulk-status.dto';
import { BulkAssignDto } from './dto/bulk-assign.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { UpdateAssetStatusDto } from './dto/update-asset-status.dto';
import { TransferAssetDto } from './dto/transfer-asset.dto';

export interface BulkResult {
  succeeded: string[];
  failed: { id: string; reason: string }[];
  skipped: string[];
}

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
    private readonly lifecycle: AssetLifecycleService,
    private readonly audit: AuditLogsService,
    private readonly history: AssetHistoryService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(query?: {
    search?: string;
    categoryId?: string;
    departmentId?: string;
    locationId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const qb = this.assetRepo
      .createQueryBuilder('asset')
      .skip((page - 1) * limit)
      .take(limit);

    if (query?.search) {
      qb.andWhere(
        '(asset.name ILIKE :s OR asset.assetTag ILIKE :s OR asset.serialNumber ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }
    if (query?.categoryId)
      qb.andWhere('asset.categoryId = :c', { c: query.categoryId });
    if (query?.departmentId)
      qb.andWhere('asset.departmentId = :d', { d: query.departmentId });
    if (query?.locationId)
      qb.andWhere('asset.locationId = :l', { l: query.locationId });
    if (query?.status) qb.andWhere('asset.status = :st', { st: query.status });

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const asset = await this.assetRepo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException(`Asset ${id} not found`);
    return asset;
  }

  async create(dto: Partial<Asset>) {
    const count = await this.assetRepo.count();
    const assetTag =
      dto.assetTag || `AST-${String(count + 1).padStart(5, '0')}`;
    const asset = this.assetRepo.create({ ...dto, assetTag });
    return this.assetRepo.save(asset);
  }

  async update(id: string, dto: Partial<Asset>) {
    const asset = await this.findById(id);
    Object.assign(asset, dto);
    return this.assetRepo.save(asset);
  }

  async delete(id: string) {
    const asset = await this.findById(id);
    return this.assetRepo.softRemove(asset);
  }

  /** Load an asset with the relations the frontend detail cache expects. */
  async findDetail(id: string) {
    const asset = await this.assetRepo.findOne({
      where: { id },
      relations: ASSET_DETAIL_RELATIONS,
    });
    if (!asset) throw new NotFoundException(`Asset ${id} not found`);
    return asset;
  }

  async updateStatus(id: string, dto: UpdateAssetStatusDto, actorId?: string) {
    const newStatus = this.lifecycle.normalizeStatus(dto.status);

    await this.dataSource.transaction(async (manager) => {
      const asset = await manager.findOne(Asset, { where: { id } });
      if (!asset) throw new NotFoundException(`Asset ${id} not found`);

      const previousStatus = asset.status;
      if (previousStatus === newStatus) return;

      this.lifecycle.validateTransition(previousStatus as AssetStatus, newStatus);

      asset.status = newStatus;
      await manager.save(asset);

      await this.history.record(
        {
          assetId: id,
          action: AssetHistoryAction.STATUS_CHANGED,
          description: dto.reason
            ? `Status changed from ${previousStatus} to ${newStatus}: ${dto.reason}`
            : `Status changed from ${previousStatus} to ${newStatus}`,
          previousValue: { status: previousStatus },
          newValue: { status: newStatus },
          performedById: actorId,
        },
        manager,
      );

      this.eventEmitter.emit('asset.status_changed', {
        assetId: id,
        departmentId: asset.departmentId,
        previousStatus,
        newStatus,
      });
      this.audit.logAction('ASSET_STATUS_CHANGE', 'Asset', id, actorId, {
        previousStatus,
        newStatus,
        reason: dto.reason,
      });
    });

    return this.findDetail(id);
  }

  async transfer(id: string, dto: TransferAssetDto, actorId?: string) {
    // `null` is a meaningful assignedToId (unassign), so test for presence not truthiness
    const targetsDepartment = dto.departmentId !== undefined;
    const targetsAssignee = dto.assignedToId !== undefined;
    if (!targetsDepartment && !targetsAssignee) {
      throw new BadRequestException(
        'At least one of departmentId or assignedToId is required',
      );
    }

    const note = dto.note ?? dto.notes;

    await this.dataSource.transaction(async (manager) => {
      const asset = await manager.findOne(Asset, { where: { id } });
      if (!asset) throw new NotFoundException(`Asset ${id} not found`);

      if (dto.departmentId) {
        const department = await manager.findOne(Department, {
          where: { id: dto.departmentId },
        });
        if (!department) {
          throw new BadRequestException(`Department ${dto.departmentId} not found`);
        }
      }
      if (dto.assignedToId) {
        const user = await manager.findOne(User, { where: { id: dto.assignedToId } });
        if (!user) {
          throw new BadRequestException(`User ${dto.assignedToId} not found`);
        }
      }

      const previous = {
        departmentId: asset.departmentId ?? null,
        assignedToId: asset.assignedToUserId ?? null,
        status: asset.status,
      };

      if (dto.departmentId !== undefined) asset.departmentId = dto.departmentId;
      if (targetsAssignee) {
        const assignedToId = dto.assignedToId ?? null;
        asset.assignedToUserId = assignedToId;
        // Assigning a holder flips the asset to ASSIGNED; clearing it frees the asset.
        const derivedStatus = assignedToId
          ? AssetStatus.ASSIGNED
          : AssetStatus.AVAILABLE;
        if (
          previous.assignedToId !== assignedToId &&
          asset.status !== derivedStatus
        ) {
          this.lifecycle.validateTransition(asset.status as AssetStatus, derivedStatus);
          asset.status = derivedStatus;
        }
      }

      await manager.save(asset);

      const next = {
        departmentId: asset.departmentId ?? null,
        assignedToId: asset.assignedToUserId ?? null,
        status: asset.status,
      };

      await this.history.record(
        {
          assetId: id,
          action: AssetHistoryAction.TRANSFERRED,
          description: this.describeTransfer(previous, next, note),
          previousValue: previous,
          newValue: next,
          performedById: actorId,
        },
        manager,
      );

      this.eventEmitter.emit('asset.transferred', {
        assetId: id,
        previous,
        new: next,
        actorId,
      });
      this.audit.logAction('ASSET_TRANSFER', 'Asset', id, actorId, {
        previous,
        new: next,
        note,
      });
    });

    return this.findDetail(id);
  }

  private describeTransfer(
    previous: { departmentId: string | null; assignedToId: string | null },
    next: { departmentId: string | null; assignedToId: string | null },
    note?: string,
  ) {
    const parts: string[] = [];
    if (previous.departmentId !== next.departmentId) {
      parts.push(
        `department ${previous.departmentId ?? 'none'} → ${next.departmentId ?? 'none'}`,
      );
    }
    if (previous.assignedToId !== next.assignedToId) {
      parts.push(
        `assignee ${previous.assignedToId ?? 'none'} → ${next.assignedToId ?? 'none'}`,
      );
    }
    const summary = parts.length
      ? `Asset transferred: ${parts.join(', ')}`
      : 'Asset transfer recorded with no field changes';
    return note ? `${summary}. Note: ${note}` : summary;
  }

  async bulkStatus(dto: BulkStatusDto, actorId?: string): Promise<BulkResult> {
    const succeeded: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    const skipped: string[] = [];

    for (const id of dto.ids) {
      await this.dataSource.transaction(async (manager) => {
        const asset = await manager.findOne(Asset, { where: { id } });
        if (!asset) {
          failed.push({ id, reason: 'Asset not found' });
          return;
        }
        if (asset.status === AssetStatus.RETIRED) {
          skipped.push(id);
          return;
        }
        try {
          this.lifecycle.validateTransition(
            asset.status as AssetStatus,
            dto.status,
          );
        } catch (err: any) {
          failed.push({
            id,
            reason: err.message || 'Invalid status transition',
          });
          return;
        }
        const previousStatus = asset.status;
        asset.status = dto.status;
        await manager.save(asset);
        this.eventEmitter.emit('asset.status_changed', {
          assetId: id,
          departmentId: asset.departmentId,
          previousStatus,
          newStatus: dto.status,
        });
        this.lifecycle.recordHistory(id, {
          eventType: 'STATUS_CHANGED',
          actorUserId: actorId || 'system',
          note: `Status changed from ${previousStatus} to ${dto.status}`,
          fieldChanges: { previousStatus, newStatus: dto.status },
        });
        this.audit.logAction({
          action: 'STATUS_CHANGED',
          entityType: 'asset',
          entityId: id,
          actorId,
          previousValue: { status: previousStatus },
          newValue: { status: dto.status },
        });
        succeeded.push(id);
      });
    }

    return { succeeded, failed, skipped };
  }

  async bulkAssign(dto: BulkAssignDto, actorId?: string): Promise<BulkResult> {
    if (!dto.userId && !dto.departmentId) {
      throw new BadRequestException(
        'At least one of userId or departmentId is required',
      );
    }

    const succeeded: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    const skipped: string[] = [];

    for (const id of dto.ids) {
      await this.dataSource.transaction(async (manager) => {
        const asset = await manager.findOne(Asset, { where: { id } });
        if (!asset) {
          failed.push({ id, reason: 'Asset not found' });
          return;
        }
        const previous = {
          assignedToUserId: asset.assignedToUserId,
          departmentId: asset.departmentId,
        };
        if (dto.userId) asset.assignedToUserId = dto.userId;
        if (dto.departmentId) asset.departmentId = dto.departmentId;
        await manager.save(asset);
        this.lifecycle.recordHistory(id, {
          eventType: 'ASSIGNED',
          actorUserId: actorId || 'system',
          note: `Bulk assignment update`,
          fieldChanges: {
            previous,
            new: { userId: dto.userId, departmentId: dto.departmentId },
          },
        });
        this.audit.logAction({
          action: 'UPDATED',
          entityType: 'asset',
          entityId: id,
          actorId,
          newValue: {
            assignedToUserId: dto.userId,
            departmentId: dto.departmentId,
          },
        });
        succeeded.push(id);
      });
    }

    return { succeeded, failed, skipped };
  }

  async bulkDelete(dto: BulkDeleteDto, actorId?: string): Promise<BulkResult> {
    const succeeded: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    const skipped: string[] = [];

    for (const id of dto.ids) {
      await this.dataSource.transaction(async (manager) => {
        const asset = await manager.findOne(Asset, { where: { id } });
        if (!asset) {
          failed.push({ id, reason: 'Asset not found' });
          return;
        }
        await manager.softRemove(asset);
        this.lifecycle.recordHistory(id, {
          eventType: 'DELETED',
          actorUserId: actorId || 'system',
          note: 'Bulk soft delete',
        });
        this.audit.logAction({
          action: 'DELETED',
          entityType: 'asset',
          entityId: id,
          actorId,
        });
        succeeded.push(id);
      });
    }

    return { succeeded, failed, skipped };
  }
}
