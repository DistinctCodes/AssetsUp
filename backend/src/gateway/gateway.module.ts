import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule, Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsGateway } from './events.gateway';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  MaintenanceRecord,
  MaintenanceStatus,
} from '../maintenance/entities/maintenance-record.entity';
import { Asset } from '../assets/entities/asset.entity';

/**
 * Periodic scheduler that scans for maintenance records due within the next 24 hours
 * and emits maintenance.due events via the event emitter.
 */
class MaintenanceDueScheduler {
  private readonly logger = new Logger(MaintenanceDueScheduler.name);

  constructor(
    @InjectRepository(MaintenanceRecord)
    private readonly maintenanceRepo: Repository<MaintenanceRecord>,
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron('0 * * * *')
  async checkDueMaintenance() {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const records = await this.maintenanceRepo.find({
      where: {
        status: MaintenanceStatus.SCHEDULED,
        scheduledDate: Between(now, tomorrow),
      },
    });

    for (const record of records) {
      const asset = await this.assetRepo.findOne({
        where: { id: record.assetId },
      });
      this.eventEmitter.emit('maintenance.due', {
        maintenanceId: record.id,
        assetId: record.assetId,
        departmentId: asset?.departmentId,
        title: record.title,
        scheduledDate: record.scheduledDate?.toISOString(),
      });
    }
    this.logger.debug(
      `Checked due maintenance, emitted ${records.length} events`,
    );
  }
}

@Module({
  imports: [
    ConfigModule,
    JwtModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([MaintenanceRecord, Asset]),
    NotificationsModule,
  ],
  providers: [EventsGateway, MaintenanceDueScheduler],
  exports: [EventsGateway],
})
export class GatewayModule {}
