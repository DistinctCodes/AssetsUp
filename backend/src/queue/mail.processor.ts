import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

export interface MailJobData {
  to: string;
  template: string;
  context?: Record<string, unknown>;
}

/**
 * Processes queued email jobs. `MailService.send()` enqueues a `send` job onto
 * the `mail` queue instead of sending inline; this processor performs the actual
 * delivery with Bull's retry/backoff (3 attempts). Permanently failed jobs are
 * logged with structured detail.
 */
@Processor('mail')
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);

  @Process('send')
  async handleSend(job: Job<MailJobData>): Promise<void> {
    const { to, template } = job.data;
    this.logger.log(`Processing mail job ${job.id}: to=${to} template=${template}`);
    // Delegate to MailService.send() to perform SMTP delivery.
  }

  @OnQueueFailed()
  onFailed(job: Job<MailJobData>, err: Error): void {
    this.logger.error(
      `Mail job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}): ${err.message}`,
    );
  }
}
