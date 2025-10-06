/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleSettings } from './entities/scheduled-settings.entity';

@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);

  constructor(
    @InjectRepository(ScheduleSettings)
    private readonly settingsRepo: Repository<ScheduleSettings>,
  ) {}

  // 🕒 Daily check for license expiry
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkLicenseExpiry() {
    this.logger.log('Running daily license expiry check...');
    // TODO: Query licenses expiring soon, send reminders
  }

  // 🕗 Daily insurance reminder
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendInsuranceReminders() {
    this.logger.log('Running insurance reminder task...');
    // TODO: Notify companies with upcoming insurance expiry
  }

  // 🧰 Weekly maintenance scheduling
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async scheduleMaintenanceTasks() {
    this.logger.log('Running weekly maintenance scheduler...');
    // TODO: Identify assets due for maintenance and alert teams
  }

  // ⚙️ Update job intervals dynamically
  async updateSettings(newSettings: Partial<ScheduleSettings>) {
    const settings = await this.settingsRepo.findOne({});
    if (!settings) return this.settingsRepo.save(newSettings);
    Object.assign(settings, newSettings);
    return this.settingsRepo.save(settings);
  }

  async getSettings() {
    return this.settingsRepo.findOne({});
  }
}
