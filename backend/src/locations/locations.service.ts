import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { CreateLocationDto } from './dtos/create-location.dto';
import { UpdateLocationDto } from './dtos/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

  async create(dto: CreateLocationDto): Promise<Location> {
    const location = this.locationRepository.create(dto);
    return this.locationRepository.save(location);
  }

  async findAll(
    query: { page?: number; limit?: number; isActive?: boolean } = {},
  ): Promise<{ data: Location[]; total: number }> {
    const { page = 1, limit = 20, isActive } = query;
    const qb = this.locationRepository
      .createQueryBuilder('location')
      .skip((page - 1) * limit)
      .take(limit);

    if (isActive !== undefined)
      qb.andWhere('location.isActive = :isActive', { isActive });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findById(id: string): Promise<Location> {
    const location = await this.locationRepository.findOne({ where: { id } });
    if (!location) throw new NotFoundException('Location not found');
    return location;
  }

  async update(id: string, dto: UpdateLocationDto): Promise<Location> {
    const location = await this.findById(id);
    Object.assign(location, dto);
    return this.locationRepository.save(location);
  }

  async remove(id: string): Promise<void> {
    const location = await this.findById(id);
    await this.locationRepository.softDelete(location.id);
  }
}
