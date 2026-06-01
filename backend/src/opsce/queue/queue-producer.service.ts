import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { GeneratePdfJobData, StellarTokenizeJobData } from './asset-processor.processor';

@Injectable()
export class QueueProducerService {
  private readonly logger = new Logger(QueueProducerService.name);

  constructor(
    @InjectQueue('asset-queue')
    private readonly assetQueue: Queue,
  ) {}

  async generatePdf(data: GeneratePdfJobData): Promise<string> {
    const job = await this.assetQueue.add(
      'generate-pdf',
      data,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    this.logger.log(`Added generate-pdf job for asset ${data.assetId} with ID ${job.id}`);
    return job.id as string;
  }

  async stellarTokenize(data: StellarTokenizeJobData): Promise<string> {
    const job = await this.assetQueue.add(
      'stellar-tokenize',
      data,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    this.logger.log(`Added stellar-tokenize job for asset ${data.assetId} with ID ${job.id}`);
    return job.id as string;
  }
}