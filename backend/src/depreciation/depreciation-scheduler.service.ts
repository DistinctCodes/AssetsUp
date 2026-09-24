import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Asset } from '../assets/entities/asset.entity';
import { DepreciationPosting } from './entities/depreciation-posting.entity';
import { DepreciationService } from './depreciation.service';

@Injectable()
export class DepreciationSchedulerService {
  private readonly logger = new Logger(DepreciationSchedulerService.name);

  constructor(
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
    @InjectRepository(DepreciationPosting)
    private readonly postingRepo: Repository<DepreciationPosting>,
    private readonly depreciationService: DepreciationService,
  ) {}

  @Cron('0 0 1 * *')
  async postMonthlyDepreciation(): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const assets = await this.assetRepo.find({
      where: {
        depreciationMethod: In(['STRAIGHT_LINE', 'DECLINING_BALANCE']),
      },
    });

    let postings = 0;
    for (const asset of assets) {
      if (!asset.usefulLifeMonths || !asset.purchaseDate) {
        continue;
      }

      const schedule = this.depreciationService.getSchedule(asset);
      if (schedule.length === 0) {
        continue;
      }

      const purchaseDate = new Date(asset.purchaseDate);
      const monthsElapsed =
        (now.getFullYear() - purchaseDate.getFullYear()) * 12 +
        (now.getMonth() - purchaseDate.getMonth());
      const period = Math.max(1, Math.min(schedule.length, monthsElapsed + 1));

      const amount = schedule[period - 1]?.depreciation ?? 0;
      if (amount <= 0) {
        continue;
      }

      await this.postingRepo.save(
        this.postingRepo.create({
          assetId: asset.id,
          periodStart,
          periodEnd,
          amount,
          method: asset.depreciationMethod ?? 'STRAIGHT_LINE',
        }),
      );
      postings++;
    }

    this.logger.log(
      `Auto-posted ${postings} depreciation posting(s) for ${periodStart.toISOString().slice(0, 10)}`,
    );
  }
}