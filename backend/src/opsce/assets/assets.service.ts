import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from './entities/asset.entity';
import { FilterAssetsDto } from './dto/filter-assets.dto';

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
  }
}
