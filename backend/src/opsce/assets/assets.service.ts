import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from './entities/asset.entity';
import { FilterAssetsDto } from './dto/filter-assets.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset, AssetStatus } from './entities/asset.entity';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import {
  BulkAssetOperationDto,
  BulkOperation,
  BulkOperationResult,
} from './dto/bulk-asset-operation.dto';
import { PaginationDto, PaginatedResponseDto, paginate } from '../common';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
  ) {}

  async findAll(filter: FilterAssetsDto, page = 1, perPage = 20) {
    const query = this.assetRepo.createQueryBuilder('asset').where('asset.deletedAt IS NULL');

    if (filter.search) {
      const search = `%${filter.search}%`;
      query.andWhere('(asset.name ILIKE :search OR asset.serialNumber ILIKE :search)', { search });
    }

    if (filter.status) {
      query.andWhere('asset.status = :status', { status: filter.status });
    }
    if (filter.condition) {
      query.andWhere('asset.condition = :condition', { condition: filter.condition });
    }
    if (filter.category) {
      query.andWhere('asset.category = :category', { category: filter.category });
    }
    if (filter.departmentId) {
      query.andWhere('asset.departmentId = :departmentId', { departmentId: filter.departmentId });
    }
    if (filter.locationId) {
      query.andWhere('asset.locationId = :locationId', { locationId: filter.locationId });
    }
    if (filter.assignedTo) {
      query.andWhere('asset.assignedToUserId = :assignedTo', { assignedTo: filter.assignedTo });
    }
    if (filter.dateFrom) {
      query.andWhere('asset.createdAt >= :dateFrom', { dateFrom: filter.dateFrom });
    }
    if (filter.dateTo) {
      query.andWhere('asset.createdAt <= :dateTo', { dateTo: filter.dateTo });
    }

    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'DESC';
    query.orderBy(`asset.${sortBy}`, sortOrder);

    const [items, total] = await query
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    return { items, total };
    private readonly assetRepository: Repository<Asset>,
    private readonly auditService: AuditService,
  ) {}

  async create(createAssetDto: CreateAssetDto): Promise<Asset> {
    const asset = this.assetRepository.create(createAssetDto);
    const saved = await this.assetRepository.save(asset);

    await this.auditService.log({
      action: 'CREATE',
      resourceType: 'Asset',
      resourceId: saved.id,
      newValue: createAssetDto as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async findAll(
    paginationDto: PaginationDto,
    search?: string,
  ): Promise<PaginatedResponseDto<Asset>> {
    if (search) {
      const { page = 1, limit = 20 } = paginationDto;
      const qb = this.assetRepository
        .createQueryBuilder('asset')
        .where(
          'asset.name ILIKE :search OR asset.category ILIKE :search OR asset.serialNumber ILIKE :search',
          { search: `%${search}%` },
        )
        .orderBy('asset.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [data, total] = await qb.getManyAndCount();
      return new PaginatedResponseDto<Asset>(data, total, page, limit);
    }

    return paginate(this.assetRepository, paginationDto, {
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Asset> {
    const asset = await this.assetRepository.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }
    return asset;
  }

  async update(
    id: string,
    updateAssetDto: UpdateAssetDto,
    userId?: string,
  ): Promise<Asset> {
    const asset = await this.findOne(id);
    const oldValue = { ...asset } as unknown as Record<string, unknown>;

    Object.assign(asset, updateAssetDto);
    const saved = await this.assetRepository.save(asset);

    await this.auditService.log({
      userId,
      action: 'UPDATE',
      resourceType: 'Asset',
      resourceId: id,
      oldValue,
      newValue: updateAssetDto as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async remove(id: string, userId?: string): Promise<void> {
    const asset = await this.findOne(id);
    await this.assetRepository.remove(asset);

    await this.auditService.log({
      userId,
      action: 'DELETE',
      resourceType: 'Asset',
      resourceId: id,
    });
  }

  /**
   * Apply a single operation to multiple assets in one request.
   * Each asset is processed independently — failures do not roll back
   * successful operations. Returns per-asset success/failure results.
   *
   * Maximum 100 IDs per request (enforced at the DTO layer).
   */
  async bulkOperation(
    dto: BulkAssetOperationDto,
    userId?: string,
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = { succeeded: [], failed: [] };

    for (const id of dto.ids) {
      try {
        await this.applyBulkOperation(id, dto.operation, dto.payload ?? {}, userId);
        result.succeeded.push(id);
      } catch (error) {
        result.failed.push({
          id,
          reason: (error as Error).message ?? 'Unknown error',
        });
      }
    }

    return result;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async applyBulkOperation(
    id: string,
    operation: BulkOperation,
    payload: Record<string, unknown>,
    userId?: string,
  ): Promise<void> {
    const asset = await this.findOne(id);
    const oldValue = { ...asset } as unknown as Record<string, unknown>;

    switch (operation) {
      case BulkOperation.UPDATE_STATUS: {
        const status = payload['status'] as AssetStatus;
        if (!status) throw new Error('payload.status is required for update-status');
        asset.status = status;
        if (payload['reason']) {
          asset.statusChangeReason = payload['reason'] as string;
          asset.statusChangedAt = new Date();
        }
        break;
      }

      case BulkOperation.REASSIGN: {
        const assignedToUserId = payload['assignedToUserId'] as string;
        if (!assignedToUserId) throw new Error('payload.assignedToUserId is required for reassign');
        asset.assignedToUserId = assignedToUserId;
        asset.assignedAt = new Date();
        break;
      }

      case BulkOperation.CHANGE_DEPARTMENT: {
        const departmentId = payload['departmentId'] as string;
        if (!departmentId) throw new Error('payload.departmentId is required for change-department');
        asset.departmentId = departmentId;
        break;
      }

      case BulkOperation.CHANGE_LOCATION: {
        const locationId = payload['locationId'] as string;
        if (!locationId) throw new Error('payload.locationId is required for change-location');
        asset.locationId = locationId;
        break;
      }

      case BulkOperation.SOFT_DELETE: {
        await this.assetRepository.softRemove(asset);
        await this.auditService.log({
          userId,
          action: 'BULK_SOFT_DELETE',
          resourceType: 'Asset',
          resourceId: id,
          oldValue,
        });
        return;
      }

      default:
        throw new Error(`Unsupported bulk operation: ${operation as string}`);
    }

    await this.assetRepository.save(asset);
    await this.auditService.log({
      userId,
      action: `BULK_${operation.toUpperCase().replace(/-/g, '_')}`,
      resourceType: 'Asset',
      resourceId: id,
      oldValue,
      newValue: payload,
    });
  }
}
