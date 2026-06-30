import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../assets/asset.entity';
import { addDays } from 'date-fns';

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  async getAssetSummary(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byCondition: Record<string, number>;
    totalValue: number;
  }> {
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

    return {
      total,
      byStatus,
      byCondition,
      totalValue: Math.round(totalValue * 100) / 100,
    };
  }

  async getDepartmentReport(): Promise<
    { departmentId: string; assetCount: number; totalValue: number }[]
  > {
    return this.assetRepository
      .createQueryBuilder('asset')
      .select('asset.departmentId', 'departmentId')
      .addSelect('COUNT(asset.id)', 'assetCount')
      .addSelect('SUM(asset.purchasePrice)', 'totalValue')
      .groupBy('asset.departmentId')
      .getRawMany();
  }

  async getCategoryReport(): Promise<
    { categoryId: string; assetCount: number; totalValue: number }[]
  > {
    return this.assetRepository
      .createQueryBuilder('asset')
      .select('asset.categoryId', 'categoryId')
      .addSelect('COUNT(asset.id)', 'assetCount')
      .addSelect('SUM(asset.purchasePrice)', 'totalValue')
      .groupBy('asset.categoryId')
      .getRawMany();
  }

  async getValueOverTime(): Promise<
    { date: string; totalValue: number; assetCount: number }[]
  > {
    return this.assetRepository
      .createQueryBuilder('asset')
      .select("DATE_TRUNC('month', asset.createdAt)", 'date')
      .addSelect('SUM(asset.purchasePrice)', 'totalValue')
      .addSelect('COUNT(asset.id)', 'assetCount')
      .groupBy("DATE_TRUNC('month', asset.createdAt)")
      .orderBy("DATE_TRUNC('month', asset.createdAt)", 'ASC')
      .getRawMany();
  }

  async getWarrantyExpiring(daysAhead: number = 90): Promise<any[]> {
    const cutoffDate = addDays(new Date(), daysAhead);
    return this.assetRepository
      .createQueryBuilder('asset')
      .where('asset.warrantyExpiration IS NOT NULL')
      .andWhere('asset.warrantyExpiration <= :cutoffDate', { cutoffDate })
      .andWhere('asset.warrantyExpiration >= NOW()')
      .select([
        'asset.id',
        'asset.name',
        'asset.serialNumber',
        'asset.warrantyExpiration',
        'asset.status',
      ])
      .orderBy('asset.warrantyExpiration', 'ASC')
      .getRawMany();
  }

  async getMaintenanceCosts(): Promise<any[]> {
    // This would typically join with a maintenance_orders table
    // For now, returning placeholder data structure
    return this.assetRepository
      .createQueryBuilder('asset')
      .select(['asset.id', 'asset.name', 'asset.categoryId'])
      .addSelect('0', 'totalMaintenanceCost')
      .addSelect('0', 'maintenanceCount')
      .getRawMany();
  }

  async getDepreciationReport(): Promise<any[]> {
    const assets = await this.assetRepository.find();
    return assets.map((asset) => {
      const purchasePrice = Number(asset.purchasePrice) || 0;
      const currentValue = Number(asset.currentValue) || purchasePrice;
      const purchaseDate = asset.purchaseDate || asset.createdAt;
      const ageInYears =
        (Date.now() - new Date(purchaseDate).getTime()) /
        (1000 * 60 * 60 * 24 * 365);

      // Simple straight-line depreciation calculation
      const depreciation = purchasePrice - currentValue;
      const annualDepreciation = ageInYears > 0 ? depreciation / ageInYears : 0;

      return {
        id: asset.id,
        name: asset.name,
        purchasePrice,
        currentValue,
        purchaseDate,
        ageInYears: Math.round(ageInYears * 100) / 100,
        totalDepreciation: Math.round(depreciation * 100) / 100,
        annualDepreciation: Math.round(annualDepreciation * 100) / 100,
      };
    });
  }
}
