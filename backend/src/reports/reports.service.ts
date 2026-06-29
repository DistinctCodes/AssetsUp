import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../assets/asset.entity';
import { ReportSchedule } from './report-schedule.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(ReportSchedule)
    private readonly scheduleRepository: Repository<ReportSchedule>,
  ) {}

  async getSummary() {
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

  async getWarrantyExpiring(daysAhead = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    return this.assetRepository
      .createQueryBuilder('asset')
      .where('asset.warrantyExpiration <= :cutoff', {
        cutoff: cutoff.toISOString().split('T')[0],
      })
      .andWhere('asset.warrantyExpiration >= :today', {
        today: new Date().toISOString().split('T')[0],
      })
      .getMany();
  }

  async getMaintenanceCosts() {
    return this.assetRepository
      .createQueryBuilder('asset')
      .select('asset.categoryId', 'categoryId')
      .addSelect('COUNT(asset.id)', 'assetCount')
      .addSelect('SUM(asset.purchasePrice)', 'totalValue')
      .groupBy('asset.categoryId')
      .getRawMany();
  }

  async getDepreciation() {
    const assets = await this.assetRepository.find({
      where: { status: 'ACTIVE' },
    });
    return assets.map((asset) => {
      const age = asset.purchaseDate
        ? Math.floor(
            (Date.now() - new Date(asset.purchaseDate).getTime()) /
              (365.25 * 24 * 3600 * 1000),
          )
        : 0;
      const depreciatedValue = Number(asset.purchasePrice) * Math.pow(0.8, age);
      return {
        id: asset.id,
        name: asset.name,
        purchasePrice: asset.purchasePrice,
        age,
        depreciatedValue: Math.round(depreciatedValue * 100) / 100,
      };
    });
  }

  async getAssetUtilisation() {
    return this.assetRepository
      .createQueryBuilder('asset')
      .select('asset.departmentId', 'departmentId')
      .addSelect('COUNT(asset.id)', 'total')
      .addSelect(
        "SUM(CASE WHEN asset.status = 'ASSIGNED' THEN 1 ELSE 0 END)",
        'assigned',
      )
      .groupBy('asset.departmentId')
      .getRawMany();
  }

  async createSchedule(
    userId: string,
    reportType: string,
    frequency: string,
    email: string,
  ): Promise<ReportSchedule> {
    const schedule = this.scheduleRepository.create({
      userId,
      reportType,
      frequency,
      email,
    });
    return this.scheduleRepository.save(schedule);
  }

  async getSchedules(userId: string): Promise<ReportSchedule[]> {
    return this.scheduleRepository.find({ where: { userId, isActive: true } });
  }

  async deleteSchedule(id: string, userId: string): Promise<void> {
    await this.scheduleRepository.delete({ id, userId });
  }
}
