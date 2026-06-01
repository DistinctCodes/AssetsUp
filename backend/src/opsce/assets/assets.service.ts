import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import { Asset } from './entities/asset.entity';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { TransferAssetDto } from './dto/transfer-asset.dto';

@Injectable()
export class AssetsService {
  private readonly relations = ['assignedToUser', 'department', 'location'];

  constructor(
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateAssetDto, userId?: string): Promise<Asset> {
    const payload = this.mapDtoToEntity(dto) as Partial<Asset>;
    if (dto.assignedTo) {
      payload.assignedAt = new Date();
    }
    if (userId) {
      payload.createdBy = userId;
    }

    const asset = this.assetRepo.create(payload);
    const saved = await this.assetRepo.save(asset);

    await this.auditService.log({
      userId,
      action: 'ASSET_CREATED',
      resourceType: 'asset',
      resourceId: saved.id,
      newValue: saved,
    });

    return this.findOne(saved.id);
  }

  async findAll(page = 1, limit = 25): Promise<{ data: Asset[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.assetRepo.findAndCount({
      relations: this.relations,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({
      where: { id },
      relations: this.relations,
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }

  async update(id: string, dto: UpdateAssetDto, userId?: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({ where: { id } });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const oldValue = {
      assignedTo: asset.assignedToUserId,
      departmentId: asset.departmentId,
      locationId: asset.locationId,
      name: asset.name,
      category: asset.category,
      status: asset.status,
      condition: asset.condition,
    };

    const payload = this.mapDtoToEntity(dto) as Partial<Asset>;
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined) {
        (asset as any)[key] = value;
      }
    });

    if (dto.assignedTo && dto.assignedTo !== asset.assignedToUserId) {
      asset.assignedAt = new Date();
    }
    if (userId) {
      asset.updatedBy = userId;
    }

    const updated = await this.assetRepo.save(asset);

    await this.auditService.log({
      userId,
      action: 'ASSET_UPDATED',
      resourceType: 'asset',
      resourceId: updated.id,
      oldValue,
      newValue: updated,
    });

    return this.findOne(updated.id);
  }

  async transfer(id: string, dto: TransferAssetDto, userId?: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({ where: { id } });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const oldValue = {
      assignedTo: asset.assignedToUserId,
      departmentId: asset.departmentId,
      locationId: asset.locationId,
    };

    if (dto.assignedTo !== undefined) {
      asset.assignedToUserId = dto.assignedTo;
      asset.assignedAt = new Date();
    }
    if (dto.departmentId !== undefined) {
      asset.departmentId = dto.departmentId;
    }
    if (dto.locationId !== undefined) {
      asset.locationId = dto.locationId;
    }
    if (userId) {
      asset.updatedBy = userId;
    }

    const updated = await this.assetRepo.save(asset);

    await this.auditService.log({
      userId,
      action: 'ASSET_TRANSFER',
      resourceType: 'asset',
      resourceId: updated.id,
      oldValue,
      newValue: {
        assignedTo: updated.assignedToUserId,
        departmentId: updated.departmentId,
        locationId: updated.locationId,
      },
    });

    return this.findOne(updated.id);
  }

  async softRemove(id: string, userId?: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({ where: { id } });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const oldValue = { ...asset };
    asset.deletedBy = userId;

    const deletedAsset = await this.assetRepo.softRemove(asset);

    await this.auditService.log({
      userId,
      action: 'ASSET_DELETED',
      resourceType: 'asset',
      resourceId: deletedAsset.id,
      oldValue,
      newValue: { deletedAt: deletedAsset.deletedAt, deletedBy: deletedAsset.deletedBy },
    });

    return deletedAsset;
  }

  private mapDtoToEntity(dto: CreateAssetDto | UpdateAssetDto | TransferAssetDto): Record<string, unknown> {
    const payload = { ...dto } as Record<string, unknown>;
    if ('assignedTo' in payload) {
      payload.assignedToUserId = payload.assignedTo;
      delete payload.assignedTo;
    }
    return payload;
  }
}
