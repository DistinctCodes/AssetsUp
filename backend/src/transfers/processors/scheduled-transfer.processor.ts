// src/transfers/processors/scheduled-transfer.processor.ts
import { Processor, Process, OnQueueError, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transfer, TransferStatus } from '../entities/transfer.entity';
import { TransferService } from '../services/transfers.service';

export interface ScheduledTransferJob {
  transferId: string;
}

@Processor('scheduled-transfers')
export class ScheduledTransferProcessor {
  private readonly logger = new Logger(ScheduledTransferProcessor.name);

  constructor(
    private readonly transferService: TransferService,
    @InjectRepository(Transfer)
    private transferRepository: Repository<Transfer>,
  ) {}

  @Process('execute-scheduled-transfer')
  async handleScheduledTransfer(job: Job<ScheduledTransferJob>): Promise<void> {
    const { transferId } = job.data;
    this.logger.log(`Processing scheduled transfer: ${transferId}`);

    try {
      const transfer = await this.transferRepository.findOne({
        where: { id: transferId },
      });

      if (!transfer) {
        this.logger.error(`Transfer ${transferId} not found`);
        return;
      }

      if (transfer.status !== TransferStatus.APPROVED) {
        this.logger.warn(
          `Transfer ${transferId} is not in APPROVED status: ${transfer.status}`,
        );
        return;
      }

      // Execute the transfer using system user (or configured admin)
      await this.transferService.executeTransfer(
        transferId,
        transfer.requestedBy.id,
      );
      this.logger.log(
        `Successfully executed scheduled transfer: ${transferId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to execute scheduled transfer ${transferId}:`,
        error,
      );
      throw error; // Re-throw for Bull retry mechanism
    }
  }

  @OnQueueError()
  onError(error: Error) {
    this.logger.error('Queue error:', error);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} failed for transfer ${job.data.transferId}:`,
      error,
    );
  }
}
