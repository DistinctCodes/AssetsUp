import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  async sendEmail(data: { to: string; subject: string; template: string; context: Record<string, any> }): Promise<void> {
    await this.emailQueue.add('send', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }
}
