// src/transfers/services/scheduled-transfer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Transfer, TransferStatus } from '../entities/transfer.entity';

@Injectable()
export class ScheduledTransferService {
  private readonly logger = new Logger(ScheduledTransferService.name);

  constructor(
    @InjectRepository(Transfer)
    private transferRepository: Repository<Transfer>,
    @InjectQueue('scheduled-transfers')
    private scheduledTransfersQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processScheduledTransfers(): Promise<void> {
    this.logger.log('Checking for scheduled transfers...');

    const now = new Date();
    const scheduledTransfers = await this.transferRepository.find({
      where: {
        status: TransferStatus.APPROVED,
        scheduledDate: LessThanOrEqual(now),
      },
      relations: ['requestedBy'],
    });

    this.logger.log(
      `Found ${scheduledTransfers.length} scheduled transfers to process`,
    );

    for (const transfer of scheduledTransfers) {
      try {
        await this.scheduledTransfersQueue.add(
          'execute-scheduled-transfer',
          { transferId: transfer.id },
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
        this.logger.log(`Queued scheduled transfer: ${transfer.id}`);
      } catch (error) {
        this.logger.error(`Failed to queue transfer ${transfer.id}:`, error);
      }
    }
  }
}
