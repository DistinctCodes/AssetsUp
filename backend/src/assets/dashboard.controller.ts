import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from './asset.entity';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  @Get('stats')
  async getStats() {
    const total = await this.assetRepository.count();
    const byStatus = await this.assetRepository
      .createQueryBuilder('asset')
      .select('asset.status', 'status')
      .addSelect('COUNT(asset.id)', 'count')
      .groupBy('asset.status')
      .getRawMany();
    const byCondition = await this.assetRepository
      .createQueryBuilder('asset')
      .select('asset.condition', 'condition')
      .addSelect('COUNT(asset.id)', 'count')
      .groupBy('asset.condition')
      .getRawMany();
    const recentAssets = await this.assetRepository.find({
      order: { createdAt: 'DESC' },
      take: 10,
    });
    const totalValue = await this.assetRepository
      .createQueryBuilder('asset')
      .select('SUM(asset.purchasePrice)', 'total')
      .getRawOne();

    return {
      total,
      byStatus,
      byCondition,
      totalValue: totalValue?.total || 0,
      recentAssets,
    };
  }

  @Get('summary')
  async getSummary() {
    const totalAssets = await this.assetRepository.count();
    const activeAssets = await this.assetRepository.count({
      where: { status: 'ACTIVE' },
    });
    const maintenanceAssets = await this.assetRepository.count({
      where: { status: 'MAINTENANCE' },
    });
    const retiredAssets = await this.assetRepository.count({
      where: { status: 'RETIRED' },
    });

    return {
      totalAssets,
      activeAssets,
      maintenanceAssets,
      retiredAssets,
    };
  }
}
