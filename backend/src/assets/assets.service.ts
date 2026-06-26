import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Asset } from './asset.entity';
import { CreateAssetDto } from './dtos/create-asset.dto';
import { UpdateAssetDto } from './dtos/update-asset.dto';
import { AssetListQueryDto } from './dtos/asset-list-query.dto';
import { UpdateStatusDto } from './dtos/update-status.dto';
import { PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class AssetsService {
  private nextAssetNumber: number;

  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    private readonly configService: ConfigService,
  ) {
    this.nextAssetNumber = parseInt(configService.get<string>('ASSET_ID_START', '1000'), 10);
  }

  async create(dto: CreateAssetDto, userId?: string): Promise<Asset> {
    const prefix = this.configService.get<string>('ASSET_ID_PREFIX', 'AST');
    const assetId = `${prefix}-${this.nextAssetNumber++}`;

    const asset = this.assetRepository.create({
      ...dto,
      assetId,
      createdById: userId,
      updatedById: userId,
    });
    return this.assetRepository.save(asset);
  }

  async findAll(query: AssetListQueryDto): Promise<PaginatedResponse<Asset>> {
    const { search, status, condition, categoryId, departmentId, assignedToId, location, sortBy, sortOrder, page, limit } = query;
    const qb = this.assetRepository.createQueryBuilder('asset')
      .leftJoinAndSelect('asset.assignedTo', 'assignedTo')
      .leftJoinAndSelect('asset.createdBy', 'createdBy')
      .leftJoinAndSelect('asset.updatedBy', 'updatedBy');

    if (search) {
      qb.andWhere(
        '(asset.name ILIKE :search OR asset.assetId ILIKE :search OR asset.serialNumber ILIKE :search OR asset.manufacturer ILIKE :search OR asset.model ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (status) qb.andWhere('asset.status = :status', { status });
    if (condition) qb.andWhere('asset.condition = :condition', { condition });
    if (categoryId) qb.andWhere('asset.categoryId = :categoryId', { categoryId });
    if (departmentId) qb.andWhere('asset.departmentId = :departmentId', { departmentId });
    if (assignedToId) qb.andWhere('asset.assignedToId = :assignedToId', { assignedToId });
    if (location) qb.andWhere('asset.location ILIKE :location', { location: `%${location}%` });

    const allowedSortFields = ['name', 'assetId', 'status', 'condition', 'createdAt', 'updatedAt', 'purchaseDate', 'purchasePrice'];
    const sortField = sortBy && allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    qb.orderBy(`asset.${sortField}`, sortOrder || 'DESC');

    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResponse(data, total, page, limit);
  }

  async findById(id: string): Promise<Asset> {
    const asset = await this.assetRepository.findOne({
      where: { id },
      relations: ['assignedTo', 'createdBy', 'updatedBy'],
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async findByAssetId(assetId: string): Promise<Asset> {
    const asset = await this.assetRepository.findOne({
      where: { assetId },
      relations: ['assignedTo', 'createdBy', 'updatedBy'],
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async update(id: string, dto: UpdateAssetDto, userId?: string): Promise<Asset> {
    const asset = await this.findById(id);
    Object.assign(asset, dto);
    if (userId) asset.updatedById = userId;
    return this.assetRepository.save(asset);
  }

  async remove(id: string): Promise<void> {
    const asset = await this.findById(id);
    await this.assetRepository.softDelete(asset.id);
  }

  async updateStatus(id: string, dto: UpdateStatusDto, userId?: string): Promise<Asset> {
    const asset = await this.findById(id);
    asset.status = dto.status;
    asset.updatedById = userId;
    return this.assetRepository.save(asset);
  }
}
