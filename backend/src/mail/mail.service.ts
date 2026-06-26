import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: configService.get<string>('SMTP_HOST', ''),
      port: parseInt(configService.get<string>('SMTP_PORT', '587'), 10),
      secure: configService.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: {
        user: configService.get<string>('SMTP_USER', ''),
        pass: configService.get<string>('SMTP_PASS', ''),
      },
    });
  }

  async sendPasswordResetEmail(email: string, resetLink: string) {
    await this.sendTemplateEmail(email, 'Password Reset', 'password-reset', { resetLink });
  }

  async sendWelcomeEmail(email: string, name: string) {
    await this.sendTemplateEmail(email, 'Welcome to AssetsUp', 'welcome', { name });
  }

  async sendTemplateEmail(to: string, subject: string, template: string, context: Record<string, any>) {
    const html = this.renderTemplate(template, context);
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM', 'noreply@assetsup.local'),
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to} with subject "${subject}"`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
    }
  }

  private renderTemplate(template: string, context: Record<string, any>): string {
    const templates: Record<string, (ctx: Record<string, any>) => string> = {
      'password-reset': (ctx) => `
        <h1>Password Reset</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${ctx.resetLink}">${ctx.resetLink}</a>
        <p>This link expires in 1 hour.</p>
      `,
      'welcome': (ctx) => `
        <h1>Welcome to AssetsUp!</h1>
        <p>Hello ${ctx.name},</p>
        <p>Your account has been created successfully.</p>
      `,
      'asset-checkout': (ctx) => `
        <h1>Asset Checked Out</h1>
        <p>Asset <strong>${ctx.assetName}</strong> has been checked out to ${ctx.assignedTo}.</p>
        <p>Due date: ${ctx.dueDate}</p>
      `,
      'maintenance-due': (ctx) => `
        <h1>Maintenance Due</h1>
        <p>Asset <strong>${ctx.assetName}</strong> has scheduled maintenance due on ${ctx.dueDate}.</p>
      `,
      'warranty-expiry': (ctx) => `
        <h1>Warranty Expiry Notice</h1>
        <p>The warranty for <strong>${ctx.assetName}</strong> expires on ${ctx.expiryDate}.</p>
      `,
    };
    const render = templates[template];
    if (!render) {
      this.logger.warn(`Unknown email template: ${template}`);
      return `<p>${subject}</p>`;
    }
    return render(context);
  }
}
