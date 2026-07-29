import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
  ) {}

  async findAll() {
    return this.locationRepo.find();
  }

  async findById(id: string) {
    const loc = await this.locationRepo.findOne({ where: { id } });
    if (!loc) throw new NotFoundException(`Location ${id} not found`);
    return loc;
  }

  async create(dto: Partial<Location>) {
    const loc = this.locationRepo.create(dto);
    return this.locationRepo.save(loc);
  }

  async update(id: string, dto: Partial<Location>) {
    const loc = await this.findById(id);
    if (dto.parentLocationId && dto.parentLocationId === id) {
      throw new BadRequestException('A location cannot be its own parent');
    }
    Object.assign(loc, dto);
    return this.locationRepo.save(loc);
  }

  async delete(id: string) {
    const loc = await this.findById(id);
    return this.locationRepo.remove(loc);
  }
}
