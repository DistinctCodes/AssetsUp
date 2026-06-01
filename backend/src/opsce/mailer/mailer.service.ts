import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import {
  PASSWORD_RESET_TEMPLATE,
  MAINTENANCE_DUE_TEMPLATE,
} from './templates/email.templates';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST', 'localhost');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER', '');
    const pass = this.configService.get<string>('SMTP_PASS', '');
    this.from = this.configService.get<string>(
      'SMTP_FROM',
      'noreply@assetsup.io',
    );

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  /**
   * Send a password-reset email containing a tokenised reset link.
   * Failures are caught and logged — they do not propagate to the caller.
   *
   * @param to    Recipient email address
   * @param token Password-reset token (appended to the reset URL)
   */
  async sendPasswordReset(to: string, token: string): Promise<void> {
    const baseUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const resetLink = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: 'Reset your AssetsUp password',
        html: PASSWORD_RESET_TEMPLATE(resetLink),
      });
      this.logger.log(`Password-reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password-reset email to ${to}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  /**
   * Send a maintenance-due reminder email.
   * Failures are caught and logged — they do not propagate to the caller.
   *
   * @param to        Recipient email address
   * @param assetName Human-readable name of the asset
   * @param dueDate   Formatted due date string (e.g. "2026-07-01")
   */
  async sendMaintenanceDue(
    to: string,
    assetName: string,
    dueDate: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: `Maintenance due: ${assetName}`,
        html: MAINTENANCE_DUE_TEMPLATE(assetName, dueDate),
      });
      this.logger.log(
        `Maintenance-due email sent to ${to} for asset "${assetName}"`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send maintenance-due email to ${to}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
