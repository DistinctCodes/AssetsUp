import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendPasswordResetEmail(email: string, resetLink: string) {
    this.logger.log(`[MailService] Sending password reset email to ${email}. Link: ${resetLink}`);
    // Inn a real application, implement NodeMailer or similar here.
  }
}
//   async sendPasswordResetEmail(email: string, resetLink: string) {
//     this.logger.log(`[MailService] Sending password reset email to ${email}. Link: ${resetLink}`);
//     // Inn a real application, implement NodeMailer or similar here.
//   }
// }
