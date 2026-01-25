import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get('SMTP_PORT', 587),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendReportEmail(
    recipients: string[],
    reportName: string,
    executionId: string,
  ): Promise<void> {
    try {
      const downloadUrl = `${this.configService.get('BASE_URL')}/api/v1/report-executions/${executionId}/download`;

      const mailOptions = {
        from: this.configService.get('SMTP_FROM', 'noreply@assetsup.com'),
        to: recipients.join(', '),
        subject: `Scheduled Report: ${reportName}`,
        html: this.getEmailTemplate(reportName, downloadUrl),
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Report email sent to ${recipients.length} recipients`);
    } catch (error) {
      this.logger.error(`Failed to send report email: ${error.message}`);
      throw error;
    }
  }

  private getEmailTemplate(reportName: string, downloadUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 0 0 5px 5px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Scheduled Report Ready</h1>
          </div>
          <div class="content">
            <h2>${reportName}</h2>
            <p>Your scheduled report has been generated and is ready for download.</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <a href="${downloadUrl}" class="button">Download Report</a>
            <p><strong>Note:</strong> This download link will expire in 24 hours.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from AssetsUp Report System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}