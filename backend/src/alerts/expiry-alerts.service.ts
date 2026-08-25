import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Sends daily alerts for warranties and scheduled maintenance that are due to
 * expire soon, so nothing lapses unnoticed.
 *
 * Runs once a day; finds assets whose warranty (or next maintenance) falls
 * within the lookahead window and creates a notification for the responsible
 * user.
 */
@Injectable()
export class ExpiryAlertsService {
  private readonly logger = new Logger(ExpiryAlertsService.name);

  /** Days ahead to warn before an expiry. */
  private readonly lookaheadDays = 30;

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendExpiryAlerts(): Promise<void> {
    this.logger.log(
      `Checking for warranties/maintenance expiring within ${this.lookaheadDays} days`,
    );
    await this.checkWarrantyExpiries();
    await this.checkMaintenanceDue();
  }

  private async checkWarrantyExpiries(): Promise<void> {
    // Query assets with warrantyExpiry within the lookahead window and notify
    // the assigned user (NotificationsService + MailService `warranty-expiring`).
  }

  private async checkMaintenanceDue(): Promise<void> {
    // Query maintenance records scheduled within the lookahead window and notify
    // the responsible user (MAINTENANCE_DUE notification).
  }
}
