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
    await this.sendTemplateEmail(email, 'Password Reset', 'password-reset', {
      resetLink,
    });
  }

  async sendWelcomeEmail(email: string, name: string) {
    await this.sendTemplateEmail(email, 'Welcome to AssetsUp', 'welcome', {
      name,
    });
  }

  async sendTemplateEmail(
    to: string,
    subject: string,
    template: string,
    context: Record<string, any>,
    attachment?: { filename: string; content: Buffer; contentType: string },
  ) {
    const html = this.renderTemplate(template, context);
    try {
      const mailOptions: any = {
        from: this.configService.get<string>(
          'MAIL_FROM',
          'noreply@assetsup.local',
        ),
        to,
        subject,
        html,
      };

      if (attachment) {
        mailOptions.attachments = [
          {
            filename: attachment.filename,
            content: attachment.content,
            contentType: attachment.contentType,
          },
        ];
      }

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to ${to} with subject "${subject}"`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
    }
  }

  private renderTemplate(
    template: string,
    context: Record<string, any>,
  ): string {
    const templates: Record<string, (ctx: Record<string, any>) => string> = {
      'password-reset': (ctx) => `
        <h1>Password Reset</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${ctx.resetLink}">${ctx.resetLink}</a>
        <p>This link expires in 1 hour.</p>
      `,
      welcome: (ctx) => `
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
        <p>Asset <strong>${ctx.assetName}</strong> (${ctx.assetId}) has scheduled maintenance due on <strong>${ctx.dueDate}</strong>.</p>
        <p>Description: ${ctx.description}</p>
        <p><a href="${ctx.assetLink}">View Asset</a></p>
      `,
      'warranty-expiry': (ctx) => `
        <h1>Warranty Expiry Notice</h1>
        <p>The warranty for <strong>${ctx.assetName}</strong> (${ctx.assetId}) expires on <strong>${ctx.expiryDate}</strong>.</p>
        ${ctx.daysRemaining ? `<p>Days remaining: ${ctx.daysRemaining}</p>` : ''}
        <p><a href="${ctx.assetLink}">View Asset</a></p>
      `,
      'export-ready': (ctx) => `
        <h1>Your Report is Ready</h1>
        <p>Your <strong>${ctx.reportName}</strong> report has been generated successfully.</p>
        <p>Format: ${ctx.format.toUpperCase()}</p>
        <p>Total rows: ${ctx.rowCount}</p>
        <p>Please find the report attached to this email.</p>
      `,
      'asset-transferred': (ctx) => `
        <h1>Asset Transferred</h1>
        <p>Asset <strong>${ctx.assetName}</strong> (${ctx.assetId}) has been transferred.</p>
        ${ctx.assignedTo ? `<p>Assigned to: ${ctx.assignedTo}</p>` : ''}
        ${ctx.location ? `<p>Location: ${ctx.location}</p>` : ''}
        <p><a href="${ctx.assetLink}">View Asset</a></p>
      `,
      'asset-status-changed': (ctx) => `
        <h1>Asset Status Changed</h1>
        <p>Asset <strong>${ctx.assetName}</strong> (${ctx.assetId}) status changed from ${ctx.oldStatus} to <strong>${ctx.newStatus}</strong>.</p>
        <p><a href="${ctx.assetLink}">View Asset</a></p>
      `,
      'work-order-assigned': (ctx) => `
        <h1>Work Order Assigned</h1>
        <p>You have been assigned to work order <strong>${ctx.workOrderId}</strong>.</p>
        <p>Asset: ${ctx.assetName}</p>
        <p>Description: ${ctx.description}</p>
        ${ctx.dueDate ? `<p>Due Date: ${ctx.dueDate}</p>` : ''}
        <p><a href="${ctx.workOrderLink}">View Work Order</a></p>
      `,
      'work-order-completed': (ctx) => `
        <h1>Work Order Completed</h1>
        <p>Work order <strong>${ctx.workOrderId}</strong> has been completed.</p>
        <p>Asset: ${ctx.assetName}</p>
        <p>Completed by: ${ctx.completedBy}</p>
        <p><a href="${ctx.workOrderLink}">View Work Order</a></p>
      `,

      'checkout-overdue': (ctx) => `
        <h1>Checkout Overdue</h1>
        <p>Asset <strong>${ctx.assetName}</strong> (${ctx.assetId}) checkout is overdue.</p>
        <p>Checked out to: ${ctx.assignedTo}</p>
        <p>Due date: ${ctx.dueDate}</p>
        <p>Days overdue: ${ctx.daysOverdue}</p>
        <p><a href="${ctx.checkoutLink}">View Checkout</a></p>
      `,
      'contract-expiring': (ctx) => `
        <h1>Contract Expiring Soon</h1>
        <p>Contract <strong>${ctx.contractName}</strong> expires on <strong>${ctx.expiryDate}</strong>.</p>
        ${ctx.daysRemaining ? `<p>Days remaining: ${ctx.daysRemaining}</p>` : ''}
        <p><a href="${ctx.contractLink}">View Contract</a></p>
      `,
      'low-stock': (ctx) => `
        <h1>Low Stock Alert</h1>
        <p>Asset <strong>${ctx.assetName}</strong> is running low.</p>
        <p>Current quantity: ${ctx.currentQuantity}</p>
        <p>Minimum threshold: ${ctx.minThreshold}</p>
        <p><a href="${ctx.assetLink}">View Asset</a></p>
      `,
      'booking-confirmed': (ctx) => `
        <h1>Booking Confirmed</h1>
        <p>Your booking for <strong>${ctx.assetName}</strong> has been confirmed.</p>
        <p>Start date: ${ctx.startDate}</p>
        <p>End date: ${ctx.endDate}</p>
        <p><a href="${ctx.bookingLink}">View Booking</a></p>
      `,
      'booking-cancelled': (ctx) => `
        <h1>Booking Cancelled</h1>
        <p>Your booking for <strong>${ctx.assetName}</strong> has been cancelled.</p>
        <p>Start date: ${ctx.startDate}</p>
        <p>End date: ${ctx.endDate}</p>
        ${ctx.reason ? `<p>Reason: ${ctx.reason}</p>` : ''}
        <p><a href="${ctx.bookingLink}">View Details</a></p>
      `,
    };
    const render = templates[template];
    if (!render) {
      this.logger.warn(`Unknown email template: ${template}`);
      return `<p>Unknown template: ${template}</p>`;
    }
    return render(context);
  }
}
