import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MailService } from '../../mail/mail.service';
import { ActivityLogService } from '../../activity-log/activity-log.service';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly mailService: MailService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Process('send')
  async handleSend(
    job: Job<{
      to: string;
      subject: string;
      template: string;
      context: Record<string, any>;
    }>,
  ) {
    this.logger.log(`Processing email job #${job.id} to ${job.data.to}`);
    try {
      await this.mailService.sendTemplateEmail(
        job.data.to,
        job.data.subject,
        job.data.template,
        job.data.context,
      );
    } catch (error) {
      this.logger.error(
        `Email job #${job.id} failed permanently after ${job.attemptsMade} attempts`,
      );

      // Log permanent failure to audit log
      await this.activityLogService.create({
        action: 'EMAIL_SEND_FAILED',
        entityType: 'Notification',
        entityId: job.id?.toString(),
        metadata: {
          to: job.data.to,
          subject: job.data.subject,
          template: job.data.template,
          error: error.message,
          attemptsMade: job.attemptsMade,
        },
      });

      throw error;
    }
  }
}
