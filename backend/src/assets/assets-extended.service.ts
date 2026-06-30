import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from './entities/asset.entity';
import { AssetHistory } from './entities/asset-history.entity';
import { AssetDocument } from './entities/asset-document.entity';
import { MaintenanceRecord } from './entities/maintenance-record.entity';
import { TransferAssetDto } from './dtos/transfer-asset.dto';
import { CreateMaintenanceDto } from './dtos/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dtos/update-maintenance.dto';
import { HistoryQueryDto } from './dtos/history-query.dto';
import {
  NotificationDispatchService,
  DispatchNotificationDto,
} from '../notifications/notification-dispatch.service';
import { NotificationEvent } from '../notifications/enums/notification-event.enum';

@Injectable()
export class AssetsExtendedService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(AssetHistory)
    private readonly historyRepository: Repository<AssetHistory>,
    @InjectRepository(AssetDocument)
    private readonly documentRepository: Repository<AssetDocument>,
    @InjectRepository(MaintenanceRecord)
    private readonly maintenanceRepository: Repository<MaintenanceRecord>,
    private readonly notificationDispatchService: NotificationDispatchService,
  ) {}

  async transfer(
    id: string,
    dto: TransferAssetDto,
    userId?: string,
  ): Promise<Asset> {
    const asset = await this.assetRepository.findOne({
      where: { id },
      relations: ['assignedTo'],
    });
    if (!asset) throw new NotFoundException('Asset not found');

    const previousValue: Record<string, unknown> = {
      assignedToId: asset.assignedToId,
      departmentId: asset.departmentId,
      location: asset.location,
    };
    const newValue: Record<string, unknown> = { ...dto };

    Object.assign(asset, dto);
    asset.updatedById = userId;
    await this.assetRepository.save(asset);

    await this.historyRepository.save(
      this.historyRepository.create({
        assetId: id,
        action: 'TRANSFERRED',
        description: dto.notes || 'Asset transferred',
        previousValue: previousValue as Record<string, unknown>,
        newValue: newValue as Record<string, unknown>,
        performedById: userId,
      }),
    );

    // Send notification for asset transfer
    if (dto.assignedToId) {
      const notificationDto: DispatchNotificationDto = {
        userId: dto.assignedToId,
        event: NotificationEvent.ASSET_TRANSFERRED,
        title: 'Asset Transferred',
        message: `Asset ${asset.name} (${asset.assetId}) has been transferred to you.`,
        entityType: 'Asset',
        entityId: id,
        metadata: {
          assetName: asset.name,
          assetId: asset.assetId,
          previousAssignee: previousValue.assignedToId,
          newAssignee: dto.assignedToId,
        },
        emailTemplate: 'asset-transferred',
        emailSubject: `Asset Transferred: ${asset.name}`,
        emailContext: {
          assetName: asset.name,
          assetId: asset.assetId,
          assignedTo: dto.assignedToId,
          location: dto.location || asset.location,
          assetLink: `${process.env.FRONTEND_URL}/assets/${id}`,
        },
      };
      await this.notificationDispatchService.dispatch(notificationDto);
    }

    return asset;
  }

  async getHistory(assetId: string, query: HistoryQueryDto) {
    const qb = this.historyRepository
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.performedBy', 'performedBy')
      .where('h.assetId = :assetId', { assetId })
      .orderBy('h.createdAt', 'DESC');

    if (query.action)
      qb.andWhere('h.action = :action', { action: query.action });
    if (query.startDate)
      qb.andWhere('h.createdAt >= :startDate', { startDate: query.startDate });
    if (query.endDate)
      qb.andWhere('h.createdAt <= :endDate', { endDate: query.endDate });
    if (query.search)
      qb.andWhere('h.description ILIKE :search', {
        search: `%${query.search}%`,
      });

    return qb.getMany();
  }

  async addDocument(
    assetId: string,
    file: Express.Multer.File,
    userId?: string,
  ): Promise<AssetDocument> {
    const asset = await this.assetRepository.findOne({
      where: { id: assetId },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    const doc = this.documentRepository.create({
      assetId,
      name: file.originalname,
      type: file.mimetype,
      url: '', // Will be set after S3 upload
      s3Key: `${assetId}/${Date.now()}-${file.originalname}`,
      size: file.size,
      uploadedById: userId,
    });
    await this.documentRepository.save(doc);

    await this.historyRepository.save(
      this.historyRepository.create({
        assetId,
        action: 'DOCUMENT_UPLOADED',
        description: `Document "${file.originalname}" uploaded`,
        performedById: userId,
      }),
    );

    return doc;
  }

  async listDocuments(assetId: string) {
    return this.documentRepository.find({
      where: { assetId },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async deleteDocument(assetId: string, documentId: string): Promise<void> {
    const doc = await this.documentRepository.findOne({
      where: { id: documentId, assetId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    await this.documentRepository.remove(doc);
  }

  async createMaintenance(
    assetId: string,
    dto: CreateMaintenanceDto,
    userId?: string,
  ): Promise<MaintenanceRecord> {
    const asset = await this.assetRepository.findOne({
      where: { id: assetId },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    const record = this.maintenanceRepository.create({
      assetId,
      ...dto,
      performedById: userId,
    });
    await this.maintenanceRepository.save(record);

    await this.historyRepository.save(
      this.historyRepository.create({
        assetId,
        action: 'MAINTENANCE',
        description: `Maintenance scheduled: ${dto.description}`,
        performedById: userId,
      }),
    );

    return record;
  }

  async getMaintenanceRecords(assetId: string) {
    return this.maintenanceRepository.find({
      where: { assetId },
      relations: ['performedBy'],
      order: { scheduledDate: 'DESC' },
    });
  }

  async updateMaintenance(
    assetId: string,
    recordId: string,
    dto: UpdateMaintenanceDto,
  ): Promise<MaintenanceRecord> {
    const record = await this.maintenanceRepository.findOne({
      where: { id: recordId, assetId },
    });
    if (!record) throw new NotFoundException('Maintenance record not found');
    Object.assign(record, dto);
    return this.maintenanceRepository.save(record);
  }
}
