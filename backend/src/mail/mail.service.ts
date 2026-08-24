import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export type MailTemplate =
  | 'welcome'
  | 'transfer-decision'
  | 'warranty-expiring';

/** Renders a template + context into a subject and HTML body. */
function renderTemplate(
  template: MailTemplate,
  context: Record<string, unknown>,
): { subject: string; html: string } {
  const layout = (title: string, body: string) =>
    `<div style="font-family:sans-serif"><h2>${title}</h2>${body}<hr/><small>AssetsUp</small></div>`;

  switch (template) {
    case 'welcome':
      return {
        subject: 'Welcome to AssetsUp',
        html: layout('Welcome', `<p>Hi ${context.name ?? 'there'}, your account is ready.</p>`),
      };
    case 'transfer-decision':
      return {
        subject: `Asset transfer ${context.decision ?? 'update'}`,
        html: layout(
          'Transfer decision',
          `<p>Your transfer request for <b>${context.assetName ?? 'an asset'}</b> was <b>${context.decision ?? 'updated'}</b>.</p>`,
        ),
      };
    case 'warranty-expiring':
      return {
        subject: 'Warranty expiring soon',
        html: layout(
          'Warranty expiring',
          `<p>The warranty for <b>${context.assetName ?? 'an asset'}</b> expires on ${context.expiresOn ?? 'soon'}.</p>`,
        ),
      };
  }
}

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
    const { subject, html } = renderTemplate(template, context);

    if (!this.transporter) {
      this.logger.log(`[mail:dev] to=${to} template=${template} subject="${subject}"`);
      return;
    }

    await this.transporter.sendMail({
      from: this.config.get<string>('MAIL_FROM') ?? 'no-reply@assetsup.local',
      to,
      subject,
      html,
    });
  }
}
