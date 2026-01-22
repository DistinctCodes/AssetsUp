import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { AssetTransfer, TransferStatus, TransferType } from './entities/asset-transfer.entity';
import { Notification, NotificationType, NotificationPriority } from './entities/notification.entity';
import { TransferHistory, HistoryAction } from './entities/transfer-history.entity';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { ApproveTransferDto, RejectTransferDto } from './dto/approve-transfer.dto';
import { TransferFilterDto } from './dto/transfer-filter.dto';

@Injectable()
export class AssetTransfersService {
  constructor(
    @InjectRepository(AssetTransfer)
    private readonly transferRepository: Repository<AssetTransfer>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(TransferHistory)
    private readonly historyRepository: Repository<TransferHistory>,
  ) {}

  async createTransfer(createTransferDto: CreateTransferDto, userId: string): Promise<AssetTransfer> {
    // Validate that assets exist and user has permission
    // This would integrate with your asset service
    
    const transfer = this.transferRepository.create({
      ...createTransferDto,
      createdBy: userId,
      status: createTransferDto.approvalRequired ? TransferStatus.PENDING : TransferStatus.APPROVED,
    });

    const savedTransfer = await this.transferRepository.save(transfer);
    
    // Create history record
    await this.createHistoryRecord(savedTransfer.id, savedTransfer.assetIds[0], userId, HistoryAction.CREATED, 'Transfer request created');
    
    // Send notifications
    if (createTransferDto.approvalRequired) {
      await this.sendNotification(
        savedTransfer.createdBy,
        'Transfer Request Created',
        `Your transfer request for ${savedTransfer.assetIds.length} asset(s) has been submitted for approval.`,
        NotificationType.TRANSFER_REQUEST,
        NotificationPriority.MEDIUM,
        savedTransfer.id
      );
      
      // Notify approvers (this would be more sophisticated in a real implementation)
      await this.sendNotificationToApprovers(savedTransfer);
    } else {
      // Execute immediately if no approval required
      await this.executeTransfer(savedTransfer.id, userId);
    }

    return savedTransfer;
  }

  async getTransfers(filterDto: TransferFilterDto, userId: string): Promise<[AssetTransfer[], number]> {
    const queryBuilder = this.transferRepository.createQueryBuilder('transfer')
      .leftJoinAndSelect('transfer.assets', 'asset')
      .leftJoinAndSelect('transfer.sourceUser', 'sourceUser')
      .leftJoinAndSelect('transfer.destinationUser', 'destinationUser')
      .leftJoinAndSelect('transfer.creator', 'creator')
      .leftJoinAndSelect('transfer.approvedBy', 'approvedBy');

    // Apply filters
    if (filterDto.status) {
      queryBuilder.andWhere('transfer.status = :status', { status: filterDto.status });
    }
    
    if (filterDto.createdBy) {
      queryBuilder.andWhere('transfer.createdBy = :createdBy', { createdBy: filterDto.createdBy });
    }
    
    if (filterDto.departmentId) {
      queryBuilder.andWhere('(transfer.sourceDepartmentId = :deptId OR transfer.destinationDepartmentId = :deptId)', 
        { deptId: filterDto.departmentId });
    }
    
    if (filterDto.startDate) {
      queryBuilder.andWhere('transfer.createdAt >= :startDate', { startDate: new Date(filterDto.startDate) });
    }
    
    if (filterDto.endDate) {
      queryBuilder.andWhere('transfer.createdAt <= :endDate', { endDate: new Date(filterDto.endDate) });
    }

    const page = filterDto.page || 1;
    const limit = filterDto.limit || 10;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit).orderBy('transfer.createdAt', 'DESC');

    return await queryBuilder.getManyAndCount();
  }

  async getTransferById(id: string): Promise<AssetTransfer> {
    const transfer = await this.transferRepository.findOne({
      where: { id },
      relations: ['assets', 'sourceUser', 'destinationUser', 'creator', 'approvedBy']
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    return transfer;
  }

  async approveTransfer(id: string, approveDto: ApproveTransferDto): Promise<AssetTransfer> {
    const transfer = await this.getTransferById(id);
    
    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Transfer is not in pending status');
    }

    transfer.status = TransferStatus.APPROVED;
    transfer.approvedById = approveDto.approvedById;
    
    const updatedTransfer = await this.transferRepository.save(transfer);
    
    // Create history record
    await this.createHistoryRecord(id, transfer.assetIds[0], approveDto.approvedById, HistoryAction.APPROVED, approveDto.notes);
    
    // Send notifications
    await this.sendNotification(
      transfer.createdBy,
      'Transfer Approved',
      `Your transfer request has been approved.`,
      NotificationType.TRANSFER_APPROVED,
      NotificationPriority.MEDIUM,
      id
    );
    
    // Execute the transfer
    await this.executeTransfer(id, approveDto.approvedById);
    
    return updatedTransfer;
  }

  async rejectTransfer(id: string, rejectDto: RejectTransferDto): Promise<AssetTransfer> {
    const transfer = await this.getTransferById(id);
    
    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Transfer is not in pending status');
    }

    transfer.status = TransferStatus.REJECTED;
    transfer.rejectionReason = rejectDto.rejectionReason;
    
    const updatedTransfer = await this.transferRepository.save(transfer);
    
    // Create history record
    await this.createHistoryRecord(id, transfer.assetIds[0], rejectDto.rejectedById, HistoryAction.REJECTED, rejectDto.rejectionReason);
    
    // Send notifications
    await this.sendNotification(
      transfer.createdBy,
      'Transfer Rejected',
      `Your transfer request has been rejected. Reason: ${rejectDto.rejectionReason}`,
      NotificationType.TRANSFER_REJECTED,
      NotificationPriority.HIGH,
      id
    );
    
    return updatedTransfer;
  }

  async cancelTransfer(id: string, userId: string): Promise<AssetTransfer> {
    const transfer = await this.getTransferById(id);
    
    if (transfer.status !== TransferStatus.PENDING && transfer.status !== TransferStatus.APPROVED) {
      throw new BadRequestException('Transfer cannot be cancelled in current status');
    }

    transfer.status = TransferStatus.CANCELLED;
    
    const updatedTransfer = await this.transferRepository.save(transfer);
    
    // Create history record
    await this.createHistoryRecord(id, transfer.assetIds[0], userId, HistoryAction.CANCELLED, 'Transfer cancelled by user');
    
    // Send notifications
    await this.sendNotification(
      transfer.createdBy,
      'Transfer Cancelled',
      `Your transfer request has been cancelled.`,
      NotificationType.TRANSFER_CANCELLED,
      NotificationPriority.MEDIUM,
      id
    );
    
    return updatedTransfer;
  }

  private async executeTransfer(transferId: string, executorId: string): Promise<void> {
    const transfer = await this.getTransferById(transferId);
    
    // Update asset records in the database
    // This would integrate with your asset service to update asset ownership/department/location
    
    transfer.status = TransferStatus.EXECUTED;
    await this.transferRepository.save(transfer);
    
    // Create history record
    await this.createHistoryRecord(transferId, transfer.assetIds[0], executorId, HistoryAction.EXECUTED, 'Transfer executed');
    
    // Send notification
    await this.sendNotification(
      transfer.createdBy,
      'Transfer Executed',
      `Your transfer has been successfully executed.`,
      NotificationType.TRANSFER_EXECUTED,
      NotificationPriority.LOW,
      transferId
    );
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return await this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50
    });
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId }
    });
    
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    
    notification.isRead = true;
    return await this.notificationRepository.save(notification);
  }

  private async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType,
    priority: NotificationPriority,
    relatedTransferId?: string
  ): Promise<void> {
    const notification = this.notificationRepository.create({
      userId,
      title,
      message,
      type,
      priority,
      relatedTransferId,
      isRead: false
    });
    
    await this.notificationRepository.save(notification);
  }

  private async sendNotificationToApprovers(transfer: AssetTransfer): Promise<void> {
    // In a real implementation, this would identify and notify appropriate approvers
    // based on department, role, or configured approval chains
    console.log(`Would notify approvers for transfer ${transfer.id}`);
  }

  private async createHistoryRecord(
    transferId: string,
    assetId: string,
    actorId: string,
    action: HistoryAction,
    notes?: string
  ): Promise<void> {
    const history = this.historyRepository.create({
      transferId,
      assetId,
      actorId,
      action,
      notes
    });
    
    await this.historyRepository.save(history);
  }

  // Scheduled job to execute scheduled transfers
  async executeScheduledTransfers(): Promise<void> {
    const now = new Date();
    const scheduledTransfers = await this.transferRepository.find({
      where: {
        status: TransferStatus.SCHEDULED,
        scheduledDate: LessThanOrEqual(now)
      }
    });

    for (const transfer of scheduledTransfers) {
      await this.executeTransfer(transfer.id, 'system');
    }
  }
}