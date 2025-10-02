import { Injectable, Logger } from '@nestjs/common';
import {
  ContractExpiryPayload,
  NotificationService,
} from './interfaces/notification.interface';

@Injectable()
export class ConsoleNotificationService implements NotificationService {
  private readonly logger = new Logger(ConsoleNotificationService.name);

  async notifyContractExpiring(payload: ContractExpiryPayload) {
    // Replace with real email/push logic
    this.logger.warn(
      `Contract expiring soon: ${payload.contractName} (id=${payload.contractId}) for supplier ${payload.supplierId}. Expires in ${payload.daysUntilExpiry} days on ${payload.endDate}`,
    );
    // e.g., call mailerService.sendMail(...) or push to queue
  }
}
