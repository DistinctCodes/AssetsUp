import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly defaultFrom: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<number>('SMTP_PORT') ?? 0);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.defaultFrom = this.configService.get<string>('SMTP_FROM', 'no-reply@assetsup.app');

    if (!host || !port) {
      this.logger.warn('SMTP host/port not configured; email delivery disabled');
      this.transporter = null;
      return;
    }

    const secure = port === 465;
    const auth = user && pass ? { user, pass } : undefined;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth,
    });
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`Skipping email to ${options.to} because SMTP is not configured`);
      return;
    }

    const mailOptions: SendMailOptions = {
      from: options.from ?? this.defaultFrom,
      ...options,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      this.logger.error('Failed to send email', error);
    }
  }
}
