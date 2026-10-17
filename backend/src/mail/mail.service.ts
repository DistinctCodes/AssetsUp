import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailTemplate, renderTemplate } from './mail-templates';

export type { MailTemplate };

/**
 * Sends transactional email via SMTP (config from env). When SMTP is not
 * configured (e.g. local dev) it falls back to logging the message instead of
 * failing, so features that send mail work without a mail server.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: Number(this.config.get<string>('SMTP_PORT') ?? 587),
          auth: this.config.get<string>('SMTP_USER')
            ? {
                user: this.config.get<string>('SMTP_USER'),
                pass: this.config.get<string>('SMTP_PASS'),
              }
            : undefined,
        })
      : null;
  }

  async send(
    to: string,
    template: MailTemplate,
    context: Record<string, unknown> = {},
  ): Promise<void> {
    const { subject, html, text } = renderTemplate(template, context);

    if (!this.transporter) {
      this.logger.log(`[mail:dev] to=${to} template=${template} subject="${subject}"`);
      return;
    }

    await this.transporter.sendMail({
      from: this.config.get<string>('MAIL_FROM') ?? 'no-reply@assetsup.local',
      to,
      subject,
      html,
      text,
    });
  }
}
