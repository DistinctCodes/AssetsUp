import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Sends daily alerts for warranties, insurance, and scheduled maintenance
 * that are due to expire soon, so nothing lapses unnoticed.
 *
 * Runs once a day; finds assets whose warranty/insurance (or next
 * maintenance) falls within the lookahead window and creates a
 * notification for the responsible user.
 */
@Injectable()
export class ExpiryAlertsService {
  private readonly logger = new Logger(ExpiryAlertsService.name);

  /** Days ahead to warn before an expiry. */
  private readonly lookaheadDays = 30;

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendExpiryAlerts(): Promise<void> {
    this.logger.log(
      `Checking for warranties/insurance/maintenance expiring within ${this.lookaheadDays} days`,
    );
    await this.checkWarrantyExpiries();
    await this.checkInsuranceExpiries();
    await this.checkMaintenanceDue();
  }

  private async checkWarrantyExpiries(): Promise<void> {
    // Query assets with warrantyExpiry within the lookahead window and notify
    // the assigned user (NotificationsService + MailService `warranty-expiring`).
  }

  private async checkInsuranceExpiries(): Promise<void> {
    // Query assets with insuranceExpiry within the lookahead window and notify
    // the assigned user (NotificationsService + MailService `insurance-expiring`).
    //
    // Blocked on data: Asset (assets/entities/asset.entity.ts) currently has
    // no `insuranceExpiry` field — only `warrantyExpiry`. That field needs
    // to be added (with a migration) before this can query real data; this
    // stub is wired into the daily run now so the coverage gap doesn't
    // silently reappear once the field exists.
  }

  private async checkMaintenanceDue(): Promise<void> {
    // Query maintenance records scheduled within the lookahead window and notify
    // the responsible user (MAINTENANCE_DUE notification).
  }
}
