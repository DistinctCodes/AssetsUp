import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MailService } from '../../mail/mail.service';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailService: MailService) {}

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
    await this.mailService.sendTemplateEmail(
      job.data.to,
      job.data.subject,
      job.data.template,
      job.data.context,
    );
  }
}
