import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ExportColumn } from '../reporting/export.service';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('email') private readonly emailQueue: Queue,
    @InjectQueue('export') private readonly exportQueue: Queue,
  ) {}

  async sendEmail(data: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, any>;
  }): Promise<void> {
    await this.emailQueue.add('send', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }

  async queueExport(data: {
    email: string;
    reportName: string;
    format: 'pdf' | 'xlsx';
    columns: ExportColumn[];
    rows: Record<string, any>[];
  }): Promise<{ jobId: string }> {
    const job = await this.exportQueue.add('generate', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
    return { jobId: job.id.toString() };
  }
}
