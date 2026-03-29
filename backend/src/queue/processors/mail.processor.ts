import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { MailService, MailJobData } from '../../mail/mail.service';

@Processor('mail')
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {}

  @Process('send-email')
  async handleSendEmail(job: Job<MailJobData>): Promise<void> {
    this.logger.debug(`Processing mail job ${job.id}: to=${job.data.to}`);
    await this.mailService.sendMail(job.data);
    this.logger.debug(`Mail job ${job.id} completed`);
  }
}
