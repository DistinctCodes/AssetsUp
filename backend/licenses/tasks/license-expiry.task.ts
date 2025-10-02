import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LicensesService } from '../services/licenses.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class LicenseExpiryTask {
  private readonly logger = new Logger(LicenseExpiryTask.name);

  constructor(
    private readonly licensesService: LicensesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM, { name: 'checkLicenseExpiry' })
  async handleCron() {
    this.logger.log('Running scheduled job: Checking for expiring licenses...');
    
    const expiringLicenses = await this.licensesService.findLicensesNearingExpiry();

    if (expiringLicenses.length === 0) {
      this.logger.log('No new licenses nearing expiry found.');
      return;
    }

    this.logger.log(`Found ${expiringLicenses.length} licenses nearing expiry. Triggering alerts...`);

    for (const license of expiringLicenses) {
      // Emit an event for the notification module to handle
      this.eventEmitter.emit('license.nearing_expiry', {
        licenseId: license.id,
        assetId: license.assetId,
        expiryDate: license.expiryDate,
        // Add user/admin details here for notification routing
      });
    }

    // Mark these licenses as notified to prevent duplicate alerts
    const idsToUpdate = expiringLicenses.map(l => l.id);
    await this.licensesService.markAsNotified(idsToUpdate);
  }
}