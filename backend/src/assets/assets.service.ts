import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from './entities/asset.entity';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
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
    const qb = this.assetRepo.createQueryBuilder('asset')
      .skip((page - 1) * limit)
      .take(limit);

    if (query?.search) {
      qb.andWhere('(asset.name ILIKE :s OR asset.assetTag ILIKE :s OR asset.serialNumber ILIKE :s)', { s: `%${query.search}%` });
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
}
