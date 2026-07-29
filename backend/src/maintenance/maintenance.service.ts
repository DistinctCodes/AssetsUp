import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceRecord } from './entities/maintenance-record.entity';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenanceRecord)
    private readonly maintenanceRepo: Repository<MaintenanceRecord>,
  ) {}

  async findAll() {
    return this.maintenanceRepo.find();
  }

  async findById(id: string) {
    const record = await this.maintenanceRepo.findOne({ where: { id } });
    if (!record)
      throw new NotFoundException(`Maintenance record ${id} not found`);
    return record;
  }

  async create(dto: Partial<MaintenanceRecord>) {
    const record = this.maintenanceRepo.create(dto);
    return this.maintenanceRepo.save(record);
  }

  async update(id: string, dto: Partial<MaintenanceRecord>) {
    const record = await this.findById(id);
    Object.assign(record, dto);
    return this.maintenanceRepo.save(record);
  }
}
