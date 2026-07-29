import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceRecord } from './entities/maintenance-record.entity';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { UpdateMaintenanceRecordDto } from './dto/update-maintenance-record.dto';

export interface MaintenanceQuery {
  assetId?: string;
  status?: string;
  type?: string;
  departmentId?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenanceRecord)
    private readonly maintenanceRepo: Repository<MaintenanceRecord>,
  ) {}

  async findAll(query?: MaintenanceQuery) {
    const qb = this.maintenanceRepo.createQueryBuilder('record');

    if (query?.departmentId) {
      qb.innerJoin('assets', 'asset', 'asset.id = record.assetId').andWhere(
        'asset.departmentId = :departmentId',
        { departmentId: query.departmentId },
      );
    }
    if (query?.assetId)
      qb.andWhere('record.assetId = :assetId', { assetId: query.assetId });
    if (query?.status)
      qb.andWhere('record.status = :status', { status: query.status });
    if (query?.type) qb.andWhere('record.type = :type', { type: query.type });
    if (query?.from)
      qb.andWhere('record.scheduledDate >= :from', { from: query.from });
    if (query?.to) qb.andWhere('record.scheduledDate <= :to', { to: query.to });

    qb.orderBy('record.scheduledDate', 'ASC');
    return qb.getMany();
  }

  async findById(id: string) {
    const record = await this.maintenanceRepo.findOne({ where: { id } });
    if (!record)
      throw new NotFoundException(`Maintenance record ${id} not found`);
    return record;
  }

  async create(dto: CreateMaintenanceRecordDto, assetIdFromParam?: string) {
    const assetId = assetIdFromParam ?? dto.assetId;
    if (!assetId) throw new BadRequestException('assetId is required');

    const record = this.maintenanceRepo.create({
      ...dto,
      assetId,
      title: dto.title || dto.description || 'Maintenance',
      scheduledDate: dto.scheduledDate
        ? new Date(dto.scheduledDate)
        : undefined,
    });
    return this.maintenanceRepo.save(record);
  }

  async update(id: string, dto: UpdateMaintenanceRecordDto) {
    const record = await this.findById(id);
    Object.assign(record, dto, {
      scheduledDate: dto.scheduledDate
        ? new Date(dto.scheduledDate)
        : record.scheduledDate,
      completedDate: dto.completedDate
        ? new Date(dto.completedDate)
        : record.completedDate,
    });
    return this.maintenanceRepo.save(record);
  }

  async updateStatus(id: string, status: string) {
    const record = await this.findById(id);
    record.status = status as MaintenanceRecord['status'];
    if (status === 'COMPLETED' && !record.completedDate) {
      record.completedDate = new Date();
    }
    return this.maintenanceRepo.save(record);
  }
}
