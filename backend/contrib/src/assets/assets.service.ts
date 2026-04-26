import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from './asset.entity';
import { AssetHistory } from './asset-history.entity';
import { Category } from '../common/category.entity';
import { Department } from '../common/department.entity';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { DuplicateAssetDto } from './dto/duplicate-asset.dto';
import { AssetFiltersDto } from './dto/asset-filters.dto';
import { AssetHistoryAction } from './enums';
import * as Papa from 'papaparse';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
    @InjectRepository(AssetHistory)
    private readonly historyRepo: Repository<AssetHistory>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
  ) {}

  private async generateAssetId(): Promise<string> {
    const result = await this.assetRepo
      .createQueryBuilder('asset')
      .select("MAX(CAST(SUBSTRING(asset.assetId, 5) AS INTEGER))", 'max')
      .where("asset.assetId LIKE 'AST-%'")
      .getRawOne<{ max: string | null }>();

    const max = result?.max ? parseInt(result.max, 10) : 1000;
    return `AST-${max + 1}`;
  }

  async create(dto: CreateAssetDto, createdBy: string): Promise<Asset> {
    const assetId = await this.generateAssetId();

    const asset = this.assetRepo.create({
      ...dto,
      assetId,
      createdBy,
    });

    const saved = await this.assetRepo.save(asset);

    const history = this.historyRepo.create({
      asset: saved,
      action: AssetHistoryAction.CREATED,
      changes: null,
      performedBy: createdBy,
    });
    await this.historyRepo.save(history);

    return this.assetRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ['history'],
    });
  }

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

  async duplicate(id: string, dto: DuplicateAssetDto, performedBy: string): Promise<Asset> {
    const original = await this.assetRepo.findOne({ where: { id } });
    if (!original) {
      throw new NotFoundException(`Asset with id "${id}" not found`);
    }

    const assetId = await this.generateAssetId();

    const duplicated = this.assetRepo.create({
      name: dto.name || `Copy of ${original.name}`,
      description: original.description,
      assetId,
      manufacturer: original.manufacturer,
      model: original.model,
      categoryId: original.categoryId,
      departmentId: original.departmentId,
      location: original.location,
      condition: original.condition,
      value: original.value,
      purchasePrice: original.purchasePrice,
      currentValue: original.currentValue,
      purchaseDate: original.purchaseDate,
      warrantyExpiration: original.warrantyExpiration,
      status: original.status,
      assignedToId: original.assignedToId,
      tags: original.tags,
      notes: original.notes,
      createdBy: performedBy,
    });

    const saved = await this.assetRepo.save(duplicated);

    const history = this.historyRepo.create({
      asset: saved,
      action: AssetHistoryAction.CREATED,
      changes: null,
      performedBy,
    });
    await this.historyRepo.save(history);

    return this.assetRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ['category', 'department'],
    });
  }

  async getDepreciation(id: string) {
    const asset = await this.assetRepo.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`Asset with id "${id}" not found`);
    }

    if (!asset.purchasePrice || !asset.purchaseDate) {
      throw new NotFoundException('Asset must have purchasePrice and purchaseDate to calculate depreciation');
    }

    const usefulLifeYears = 5;
    const salvageValuePercent = 0.1; // 10%
    const salvageValue = asset.purchasePrice * salvageValuePercent;
    const depreciableAmount = asset.purchasePrice - salvageValue;
    const depreciationPerYear = depreciableAmount / usefulLifeYears;

    const now = new Date();
    const ageInMs = now.getTime() - asset.purchaseDate.getTime();
    const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25);

    const totalDepreciation = Math.min(depreciationPerYear * ageInYears, depreciableAmount);
    const currentBookValue = asset.purchasePrice - totalDepreciation;
    const percentDepreciated = (totalDepreciation / asset.purchasePrice) * 100;

    return {
      purchasePrice: asset.purchasePrice,
      currentBookValue: Math.max(currentBookValue, salvageValue),
      totalDepreciation,
      depreciationPerYear,
      ageInYears,
      percentDepreciated,
    };
  }

  async importCsv(csvBuffer: Buffer, performedBy: string) {
    const csvString = csvBuffer.toString('utf-8');
    const parsed = Papa.parse(csvString, { header: true, skipEmptyLines: true });

    if (parsed.errors.length > 0) {
      throw new Error(`CSV parsing error: ${parsed.errors[0].message}`);
    }

    const rows = parsed.data as any[];
    let created = 0;
    const errors: { row: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        let categoryId: string | null = null;
        if (row.categoryName) {
          let category = await this.categoryRepo.findOne({ where: { name: row.categoryName } });
          if (!category) {
            category = this.categoryRepo.create({ name: row.categoryName });
            await this.categoryRepo.save(category);
          }
          categoryId = category.id;
        }

        let departmentId: string | null = null;
        if (row.departmentName) {
          let department = await this.departmentRepo.findOne({ where: { name: row.departmentName } });
          if (!department) {
            department = this.departmentRepo.create({ name: row.departmentName });
            await this.departmentRepo.save(department);
          }
          departmentId = department.id;
        }

        const assetId = await this.generateAssetId();

        const asset = this.assetRepo.create({
          name: row.name,
          categoryId,
          departmentId,
          serialNumber: row.serialNumber || null,
          purchasePrice: row.purchasePrice ? parseFloat(row.purchasePrice) : null,
          condition: row.condition || null,
          location: row.location || null,
          createdBy: performedBy,
          assetId,
        });

        await this.assetRepo.save(asset);

        const history = this.historyRepo.create({
          asset,
          action: AssetHistoryAction.CREATED,
          changes: null,
          performedBy,
        });
        await this.historyRepo.save(history);

        created++;
      } catch (error) {
        errors.push({ row: i + 2, reason: error.message });
      }
    }

    return {
      created,
      failed: errors.length,
      errors,
    };
  }
}

