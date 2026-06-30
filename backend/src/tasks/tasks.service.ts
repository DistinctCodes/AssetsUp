import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../assets/entities/asset.entity';
import { Department } from '../users/entities/department.entity';
import { User } from '../users/entities/user.entity';
import { MailService } from '../mail/mail.service';
import {
  NotificationDispatchService,
  DispatchNotificationDto,
} from '../notifications/notification-dispatch.service';
import { NotificationEvent } from '../notifications/enums/notification-event.enum';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailService: MailService,
    private readonly notificationDispatchService: NotificationDispatchService,
  ) {}

  @Cron(CronExpression.EVERY_WEEKDAY)
  async sendDepartmentAssetSummaries() {
    this.logger.log('Starting daily department asset summary task');
    const departments = await this.departmentRepository.find({
      relations: ['children'],
    });
    for (const dept of departments) {
      const [assets, total] = await this.assetRepository.findAndCount({
        where: { departmentId: dept.id },
      });
      const active = assets.filter((a) => a.status === 'ACTIVE').length;
      const assigned = assets.filter((a) => a.status === 'ASSIGNED').length;
      const maintenance = assets.filter(
        (a) => a.status === 'MAINTENANCE',
      ).length;
      this.logger.log(
        `Department ${dept.name}: ${total} assets (${active} active, ${assigned} assigned, ${maintenance} maintenance)`,
      );
    }
    this.logger.log('Daily department asset summary task completed');
  }

  @Cron('0 9 * * MON')
  async sendWeeklyAssetSummary() {
    this.logger.log('Starting weekly asset summary report');
    const totalAssets = await this.assetRepository.count();
    const statusCounts = await this.assetRepository
      .createQueryBuilder('asset')
      .select('asset.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('asset.status')
      .getRawMany();
    this.logger.log(`Weekly summary: ${totalAssets} total assets`);
    for (const row of statusCounts) {
      this.logger.log(`  ${row.status}: ${row.count}`);
    }
  }

  @Cron('0 8 * * *')
  async checkMaintenanceDue() {
    this.logger.log('Checking for maintenance due assets');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const assets = await this.assetRepository
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.maintenanceRecords', 'maintenance')
      .where('maintenance.scheduledDate <= :tomorrow', { tomorrow })
      .andWhere('maintenance.status = :status', { status: 'SCHEDULED' })
      .getMany();

    for (const asset of assets) {
      const users = await this.userRepository.find({
        where: [
          { departmentId: asset.departmentId },
          { id: asset.createdById },
        ],
      });

      for (const user of users) {
        const notificationDto: DispatchNotificationDto = {
          userId: user.id,
          event: NotificationEvent.MAINTENANCE_DUE,
          title: 'Maintenance Due',
          message: `Asset ${asset.name} has maintenance due soon.`,
          entityType: 'Asset',
          entityId: asset.id,
          metadata: {
            assetName: asset.name,
            assetId: asset.assetId,
          },
          emailTemplate: 'maintenance-due',
          emailSubject: `Maintenance Due: ${asset.name}`,
          emailContext: {
            assetName: asset.name,
            assetId: asset.assetId,
            dueDate: tomorrow.toISOString().split('T')[0],
            description: 'Scheduled maintenance',
            assetLink: `${process.env.FRONTEND_URL}/assets/${asset.id}`,
          },
        };
        await this.notificationDispatchService.dispatch(notificationDto);
      }
    }
    this.logger.log(
      `Maintenance check completed, notified for ${assets.length} assets`,
    );
  }

  @Cron('0 9 * * *')
  async checkWarrantyExpiring() {
    this.logger.log('Checking for warranty expiring assets');
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const assets = await this.assetRepository
      .createQueryBuilder('asset')
      .where('asset.warrantyExpiration <= :thirtyDaysFromNow', {
        thirtyDaysFromNow,
      })
      .andWhere('asset.warrantyExpiration >= :today', { today: new Date() })
      .andWhere('asset.endOfLifeNotificationSent = :notSent', {
        notSent: false,
      })
      .getMany();

    for (const asset of assets) {
      const users = await this.userRepository.find({
        where: [
          { departmentId: asset.departmentId },
          { id: asset.createdById },
        ],
      });

      for (const user of users) {
        const daysRemaining = Math.floor(
          (new Date(asset.warrantyExpiration).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        );

        const notificationDto: DispatchNotificationDto = {
          userId: user.id,
          event: NotificationEvent.WARRANTY_EXPIRING,
          title: 'Warranty Expiring',
          message: `Asset ${asset.name} warranty expires in ${daysRemaining} days.`,
          entityType: 'Asset',
          entityId: asset.id,
          metadata: {
            assetName: asset.name,
            assetId: asset.assetId,
            warrantyEndDate: asset.warrantyExpiration,
            daysRemaining,
          },
          emailTemplate: 'warranty-expiry',
          emailSubject: `Warranty Expiring: ${asset.name}`,
          emailContext: {
            assetName: asset.name,
            assetId: asset.assetId,
            expiryDate: asset.warrantyExpiration,
            daysRemaining,
            assetLink: `${process.env.FRONTEND_URL}/assets/${asset.id}`,
          },
        };
        await this.notificationDispatchService.dispatch(notificationDto);
      }

      // Mark notification as sent to avoid duplicates
      asset.endOfLifeNotificationSent = true;
      await this.assetRepository.save(asset);
    }
    this.logger.log(
      `Warranty check completed, notified for ${assets.length} assets`,
    );
  }
}
