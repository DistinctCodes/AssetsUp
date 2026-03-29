import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly repo: Repository<Location>,
  ) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResponse<Location>> {
    const { page = 1, limit = 20 } = query;
    const [data, total] = await this.repo.findAndCount({ order: { name: 'ASC' }, skip: (page - 1) * limit, take: limit });
    return PaginatedResponse.of(data, total, page, limit);
  }

  async findOne(id: string): Promise<Location> {
    const location = await this.repo.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    return location;
  }

  async create(dto: CreateLocationDto): Promise<Location> {
    await this.ensureNameUnique(dto.name);
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateLocationDto): Promise<Location> {
    const location = await this.findOne(id);
    if (dto.name && dto.name !== location.name) {
      await this.ensureNameUnique(dto.name);
    }

    Object.assign(location, dto);
    return this.repo.save(location);
  }

  async remove(id: string): Promise<void> {
    const location = await this.findOne(id);
    await this.repo.remove(location);
  }

  private async ensureNameUnique(name: string): Promise<void> {
    const existing = await this.repo.findOne({ where: { name } });
    if (existing) {
      throw new ConflictException('A location with this name already exists');
    }
  }
}
