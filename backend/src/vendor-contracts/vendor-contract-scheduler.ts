import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VendorContractsService } from './vendor-contracts.service';

@Injectable()
export class VendorContractsScheduler {
  private readonly logger = new Logger(VendorContractsScheduler.name);

  constructor(
    private readonly vendorContractsService: VendorContractsService,
  ) {}

  // Runs every day at 08:00 server time — change as needed
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async dailyExpiryCheck() {
    this.logger.debug('Running daily vendor-contract expiry check');
    try {
      // configurable window (e.g., 30 days)
      await this.vendorContractsService.notifyExpiringContracts(30);
    } catch (err) {
      this.logger.error('Expiry check failed', err);
    }
  }
}
