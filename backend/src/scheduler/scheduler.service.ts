import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Asset } from '../assets/asset.entity';
import { Maintenance, MaintenanceStatus } from '../assets/maintenance.entity';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Asset)
    private readonly assetsRepo: Repository<Asset>,
    @InjectRepository(Maintenance)
    private readonly maintenanceRepo: Repository<Maintenance>,
    private readonly configService: ConfigService,
  ) {}

  @Cron(process.env.WARRANTY_CRON ?? '0 8 * * *')
  async checkWarrantyExpiry(): Promise<void> {
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(now.getDate() + 30);

    const assets = await this.assetsRepo.find({
      where: {
        warrantyExpiration: Between(now, in30Days),
      },
      select: ['id', 'assetId', 'name', 'warrantyExpiration'],
    });

    this.logger.warn(
      `[Warranty Alert] ${assets.length} asset(s) with warranty expiring within 30 days: ` +
        `[${assets.map((a) => a.assetId).join(', ')}]`,
    );
  }

  @Cron(process.env.MAINTENANCE_CRON ?? '0 8 * * *')
  async checkUpcomingMaintenance(): Promise<void> {
    const now = new Date();
    const in7Days = new Date();
    in7Days.setDate(now.getDate() + 7);

    const records = await this.maintenanceRepo.find({
      where: {
        status: MaintenanceStatus.SCHEDULED,
        scheduledDate: Between(now, in7Days) as unknown as Date,
      },
      select: ['id', 'assetId', 'scheduledDate', 'type'],
    });

    this.logger.warn(
      `[Maintenance Alert] ${records.length} scheduled maintenance record(s) due within 7 days: ` +
        `[${records.map((r) => r.assetId).join(', ')}]`,
    );
  }
}
