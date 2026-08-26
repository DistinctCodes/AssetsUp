import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../assets/entities/asset.entity';
import { DepreciationScheduleEntryDto } from './dto/depreciation-schedule-entry.dto';
import { AssetDepreciationResponseDto } from './dto/asset-depreciation-response.dto';
import { DepreciationReportDto } from './dto/depreciation-report.dto';

@Injectable()
export class DepreciationService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
  ) {}

  private async findAssetOrThrow(id: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!asset) throw new NotFoundException(`Asset ${id} not found`);
    return asset;
  }

  getSchedule(asset: Asset): DepreciationScheduleEntryDto[] {
    const method = asset.depreciationMethod;
    if (!method || method === 'NONE' || !asset.usefulLifeMonths || !asset.purchaseDate) {
      return [];
    }

    const cost = Number(asset.purchaseCost) || 0;
    const salvage = Number(asset.salvageValue) || 0;
    const usefulLife = asset.usefulLifeMonths;
    const purchaseDate = new Date(asset.purchaseDate);

    const depreciableAmount = cost - salvage;
    if (depreciableAmount <= 0 || usefulLife <= 0) {
      return [];
    }

    const purchaseDay = purchaseDate.getDate();
    const daysInMonth = new Date(
      purchaseDate.getFullYear(),
      purchaseDate.getMonth() + 1,
      0,
    ).getDate();
    const firstMonthFraction = 1 - (purchaseDay - 1) / daysInMonth;

    const schedule: DepreciationScheduleEntryDto[] = [];
    let openingValue = cost;

    if (method === 'STRAIGHT_LINE') {
      const monthlyDepreciation = depreciableAmount / usefulLife;
      for (let period = 1; period <= usefulLife; period++) {
        const isPartialFirst = period === 1 && firstMonthFraction < 1;
        const depreciation = isPartialFirst
          ? monthlyDepreciation * firstMonthFraction
          : monthlyDepreciation;

        const closingValue = Math.max(openingValue - depreciation, salvage);
        const actualDepreciation = openingValue - closingValue;

        schedule.push({
          period,
          openingValue: round(openingValue),
          depreciation: round(actualDepreciation),
          closingValue: round(closingValue),
        });

        openingValue = closingValue;
        if (openingValue <= salvage) break;
      }
    } else if (method === 'DECLINING_BALANCE') {
      const rate = 2 / usefulLife;
      for (let period = 1; period <= usefulLife; period++) {
        const isPartialFirst = period === 1 && firstMonthFraction < 1;
        let depreciation = openingValue * rate;
        if (isPartialFirst) {
          depreciation *= firstMonthFraction;
        }

        const closingValue = Math.max(openingValue - depreciation, salvage);
        const actualDepreciation = openingValue - closingValue;

        schedule.push({
          period,
          openingValue: round(openingValue),
          depreciation: round(actualDepreciation),
          closingValue: round(closingValue),
        });

        openingValue = closingValue;
        if (openingValue <= salvage) break;
      }
    }

    return schedule;
  }

  getCurrentBookValue(asset: Asset): number {
    if (!asset.depreciationMethod || asset.depreciationMethod === 'NONE') {
      return Number(asset.purchaseCost) || 0;
    }

    const schedule = this.getSchedule(asset);
    if (schedule.length === 0) {
      return Number(asset.purchaseCost) || 0;
    }

    return schedule[schedule.length - 1].closingValue;
  }

  async getAssetDepreciation(id: string): Promise<AssetDepreciationResponseDto> {
    const asset = await this.findAssetOrThrow(id);
    return {
      assetId: asset.id,
      assetTag: asset.assetTag,
      name: asset.name,
      purchaseCost: Number(asset.purchaseCost) || 0,
      purchaseDate: asset.purchaseDate ?? null,
      depreciationMethod: asset.depreciationMethod ?? null,
      usefulLifeMonths: asset.usefulLifeMonths ?? null,
      salvageValue: asset.salvageValue != null ? Number(asset.salvageValue) : null,
      currentBookValue: this.getCurrentBookValue(asset),
      schedule: this.getSchedule(asset),
    };
  }

  async getDepreciationReport(): Promise<DepreciationReportDto> {
    const assets = await this.assetRepo.find({
      where: { depreciationMethod: 'STRAIGHT_LINE' },
    });
    const assetsDB = await this.assetRepo.find({
      where: { depreciationMethod: 'DECLINING_BALANCE' },
    });

    const allDepreciatingAssets = [...assets, ...assetsDB];

    let totalBookValue = 0;
    let totalOriginalCost = 0;
    let totalAccumulatedDepreciation = 0;
    let monthlyDepreciationExpense = 0;

    const categoryMap = new Map<
      string,
      { categoryName: string | null; bookValue: number; assetCount: number }
    >();

    for (const asset of allDepreciatingAssets) {
      const bookValue = this.getCurrentBookValue(asset);
      const cost = Number(asset.purchaseCost) || 0;
      const accumulated = cost - bookValue;

      totalBookValue += bookValue;
      totalOriginalCost += cost;
      totalAccumulatedDepreciation += accumulated;

      const schedule = this.getSchedule(asset);
      if (schedule.length > 0) {
        monthlyDepreciationExpense += schedule[0].depreciation;
      }

      const catId = asset.categoryId ?? 'uncategorized';
      const existing = categoryMap.get(catId);
      if (existing) {
        existing.bookValue += bookValue;
        existing.assetCount += 1;
      } else {
        categoryMap.set(catId, {
          categoryName: asset.category?.name ?? null,
          bookValue,
          assetCount: 1,
        });
      }
    }

    return {
      totalBookValue: round(totalBookValue),
      totalOriginalCost: round(totalOriginalCost),
      totalAccumulatedDepreciation: round(totalAccumulatedDepreciation),
      monthlyDepreciationExpense: round(monthlyDepreciationExpense),
      assetCount: allDepreciatingAssets.length,
      byCategory: Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.categoryName,
        bookValue: round(data.bookValue),
        assetCount: data.assetCount,
      })),
    };
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
