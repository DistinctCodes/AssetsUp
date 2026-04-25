import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from './asset.entity';
import { AssetHistory } from './asset-history.entity';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetFiltersDto } from './dto/asset-filters.dto';
import { AssetHistoryAction } from './enums';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
    @InjectRepository(AssetHistory)
    private readonly historyRepo: Repository<AssetHistory>,
  ) {}

  async findAll(filters: AssetFiltersDto): Promise<{ data: Asset[]; total: number; page: number; limit: number }> {
    const { search, status, condition, categoryId, departmentId, page = 1, limit = 20 } = filters;
    const qb = this.assetRepo.createQueryBuilder('asset')
      .leftJoinAndSelect('asset.history', 'history')
      .where('asset.deletedAt IS NULL');

    if (search) {
      const term = `%${search}%`;
      qb.andWhere(
        `(asset.name ILIKE :term OR asset.assetId ILIKE :term OR asset.serialNumber ILIKE :term OR asset.manufacturer ILIKE :term OR asset.model ILIKE :term)`,
        { term },
      );
    }

    if (status) {
      qb.andWhere('asset.status = :status', { status });
    }

    if (condition) {
      qb.andWhere('asset.condition = :condition', { condition });
    }

    if (categoryId) {
      qb.andWhere('asset.categoryId = :categoryId', { categoryId });
    }

    if (departmentId) {
      qb.andWhere('asset.departmentId = :departmentId', { departmentId });
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({
      where: { id },
      relations: ['history'],
      withDeleted: true,
    });
    if (!asset) {
      throw new NotFoundException(`Asset with id "${id}" not found`);
    }
    return asset;
  }

  async update(id: string, dto: UpdateAssetDto, performedBy: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({
      where: { id },
      relations: ['history'],
    });
    if (!asset) {
      throw new NotFoundException(`Asset with id "${id}" not found`);
    }

    const changes: Record<string, unknown> = {};
    for (const key of Object.keys(dto)) {
      const k = key as keyof UpdateAssetDto;
      if (dto[k] !== undefined && asset[k] !== dto[k]) {
        changes[k] = { old: asset[k], new: dto[k] };
        (asset as unknown as Record<string, unknown>)[k] = dto[k];
      }
    }

    const updated = await this.assetRepo.save(asset);

    if (Object.keys(changes).length > 0) {
      const history = this.historyRepo.create({
        asset: updated,
        action: AssetHistoryAction.UPDATED,
        changes,
        performedBy,
      });
      await this.historyRepo.save(history);
    }

    return updated;
  }

  async softDelete(id: string, performedBy: string): Promise<void> {
    const asset = await this.assetRepo.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`Asset with id "${id}" not found`);
    }

    await this.assetRepo.softDelete(id);

    const history = this.historyRepo.create({
      asset,
      action: AssetHistoryAction.DELETED,
      changes: null,
      performedBy,
    });
    await this.historyRepo.save(history);
  }

  async restore(id: string, performedBy: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!asset) {
      throw new NotFoundException(`Asset with id "${id}" not found`);
    }

    await this.assetRepo.restore(id);

    const restored = await this.assetRepo.findOneOrFail({ where: { id } });

    const history = this.historyRepo.create({
      asset: restored,
      action: AssetHistoryAction.RESTORED,
      changes: null,
      performedBy,
    });
    await this.historyRepo.save(history);

    return restored;
  }
}

