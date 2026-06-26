import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../assets/asset.entity';

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  async getAssetSummary(): Promise<{ total: number; byStatus: Record<string, number>; byCondition: Record<string, number>; totalValue: number }> {
    const assets = await this.assetRepository.find();
    const total = assets.length;
    const byStatus: Record<string, number> = {};
    const byCondition: Record<string, number> = {};
    let totalValue = 0;

    for (const asset of assets) {
      byStatus[asset.status] = (byStatus[asset.status] || 0) + 1;
      byCondition[asset.condition] = (byCondition[asset.condition] || 0) + 1;
      totalValue += Number(asset.purchasePrice) || 0;
    }

    return { total, byStatus, byCondition, totalValue: Math.round(totalValue * 100) / 100 };
  }

  async getDepartmentReport(): Promise<{ departmentId: string; assetCount: number; totalValue: number }[]> {
    return this.assetRepository
      .createQueryBuilder('asset')
      .select('asset.departmentId', 'departmentId')
      .addSelect('COUNT(asset.id)', 'assetCount')
      .addSelect('SUM(asset.purchasePrice)', 'totalValue')
      .groupBy('asset.departmentId')
      .getRawMany();
  }

  async getCategoryReport(): Promise<{ categoryId: string; assetCount: number; totalValue: number }[]> {
    return this.assetRepository
      .createQueryBuilder('asset')
      .select('asset.categoryId', 'categoryId')
      .addSelect('COUNT(asset.id)', 'assetCount')
      .addSelect('SUM(asset.purchasePrice)', 'totalValue')
      .groupBy('asset.categoryId')
      .getRawMany();
  }

  async getValueOverTime(): Promise<{ date: string; totalValue: number; assetCount: number }[]> {
    return this.assetRepository
      .createQueryBuilder('asset')
      .select("DATE_TRUNC('month', asset.createdAt)", 'date')
      .addSelect('SUM(asset.purchasePrice)', 'totalValue')
      .addSelect('COUNT(asset.id)', 'assetCount')
      .groupBy("DATE_TRUNC('month', asset.createdAt)")
      .orderBy("DATE_TRUNC('month', asset.createdAt)", 'ASC')
      .getRawMany();
  }
}
