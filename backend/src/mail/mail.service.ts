import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailJobData {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST', 'smtp.mailtrap.io'),
      port: this.configService.get<number>('MAIL_PORT', 587),
      auth: {
        user: this.configService.get<string>('MAIL_USER', ''),
        pass: this.configService.get<string>('MAIL_PASS', ''),
      },
    });
  }

  async sendMail(data: MailJobData): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM', 'noreply@manageassets.com'),
      to: data.to,
      subject: data.subject,
      html: data.html,
    });
    this.logger.log(`Email sent to ${data.to}: ${data.subject}`);
  }
}
