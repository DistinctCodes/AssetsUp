import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Asset } from './entities/asset.entity';
import { AssetLifecycleService, AssetStatus } from './asset-lifecycle.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BulkStatusDto } from './dto/bulk-status.dto';
import { BulkAssignDto } from './dto/bulk-assign.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';

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
    if (query?.categoryId) qb.andWhere('asset.categoryId = :c', { c: query.categoryId });
    if (query?.departmentId) qb.andWhere('asset.departmentId = :d', { d: query.departmentId });
    if (query?.locationId) qb.andWhere('asset.locationId = :l', { l: query.locationId });
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
    const assetTag = dto.assetTag || `AST-${String(count + 1).padStart(5, '0')}`;
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
          this.lifecycle.validateTransition(asset.status as AssetStatus, dto.status);
        } catch (err: any) {
          failed.push({ id, reason: err.message || 'Invalid status transition' });
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
        this.audit.logAction('BULK_STATUS_UPDATE', 'Asset', id, actorId, {
          previousStatus,
          newStatus: dto.status,
        });
        succeeded.push(id);
      });
    }

    return { succeeded, failed, skipped };
  }

  async bulkAssign(dto: BulkAssignDto, actorId?: string): Promise<BulkResult> {
    if (!dto.userId && !dto.departmentId) {
      throw new BadRequestException('At least one of userId or departmentId is required');
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
          fieldChanges: { previous, new: { userId: dto.userId, departmentId: dto.departmentId } },
        });
        this.audit.logAction('BULK_ASSIGN', 'Asset', id, actorId, {
          userId: dto.userId,
          departmentId: dto.departmentId,
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
        this.audit.logAction('BULK_DELETE', 'Asset', id, actorId);
        succeeded.push(id);
      });
    }

    return { succeeded, failed, skipped };
  }
}
