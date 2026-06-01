import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceRecord, MaintenanceType, MaintenanceAlert } from './entities/maintenance-record.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenanceRecord)
    private readonly maintenanceRepo: Repository<MaintenanceRecord>,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(record: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
    const entity = this.maintenanceRepo.create(record);
    const saved = await this.maintenanceRepo.save(entity);

    this.eventEmitter.emit('maintenance.created', { maintenance: saved });
    this.notificationsGateway.emitMaintenanceAlert(saved.assetId, {
      assetId: saved.assetId,
      message: `New maintenance scheduled: ${saved.type}`,
      scheduledDate: saved.scheduledDate,
      type: saved.type,
    });

    return saved;
  }

  async findAll(): Promise<MaintenanceRecord[]> {
    return this.maintenanceRepo.find({ order: { scheduledDate: 'ASC' } });
  }

  async findOne(id: string): Promise<MaintenanceRecord> {
    const record = await this.maintenanceRepo.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Maintenance record with ID ${id} not found`);
    }
    return record;
  }

  async update(id: string, update: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
    const record = await this.findOne(id);
    Object.assign(record, update);
    const saved = await this.maintenanceRepo.save(record);

    this.eventEmitter.emit('maintenance.updated', { maintenance: saved });

    return saved;
  }

  async remove(id: string): Promise<void> {
    const record = await this.findOne(id);
    await this.maintenanceRepo.remove(record);

    this.eventEmitter.emit('maintenance.deleted', { maintenanceId: id });
  }
}