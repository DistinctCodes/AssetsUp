import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Asset, AssetStatus, AssetCondition } from '../assets/entities/asset.entity';
import { AssetCategory } from '../asset-categories/asset-category.entity';
import { Department } from '../departments/entities/department.entity';
import { User } from '../users/entities/user.entity';
import { RedisService } from '../common/redis.service';
import { AnalyticsQueryDto, DashboardStatsResponse, TrendsResponse, DistributionResponse } from './dto/analytics-query.dto';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AnalyticsService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(AssetCategory)
    private readonly categoryRepository: Repository<AssetCategory>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.initializeMaterializedViews();
  }

  private async initializeMaterializedViews() {
    try {
      // Create materialized view for category summary
      await this.dataSource.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS asset_category_summary AS
        SELECT 
          c.name as category_name,
          COUNT(a.id) as asset_count,
          SUM(a.current_value) as total_value
        FROM asset_categories c
        LEFT JOIN assets a ON a.category_id = c.id AND a.deleted_at IS NULL
        GROUP BY c.name;
      `);
      this.logger.log('Materialized view asset_category_summary initialized');
    } catch (error) {
      this.logger.error('Failed to initialize materialized views', error.stack);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async refreshMaterializedViews() {
    this.logger.log('Refreshing materialized views...');
    try {
      await this.dataSource.query('REFRESH MATERIALIZED VIEW asset_category_summary');
      this.logger.log('Materialized views refreshed');
    } catch (error) {
      this.logger.error('Failed to refresh materialized views', error.stack);
    }
  }

  async getDashboardStats(query: AnalyticsQueryDto, user: any): Promise<DashboardStatsResponse> {
    const cacheKey = `analytics:dashboard:${JSON.stringify(query)}:${user.role}:${user.id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const stats = await this.calculateDashboardStats(query, user);
    await this.redisService.set(cacheKey, JSON.stringify(stats), 300); // 5 minutes cache
    return stats;
  }

  private async calculateDashboardStats(query: AnalyticsQueryDto, user: any): Promise<DashboardStatsResponse> {
    const queryBuilder = this.assetRepository.createQueryBuilder('asset');
    this.applyFilters(queryBuilder, query, user);

    // Overview stats
    const totalAssets = await queryBuilder.getCount();
    const totalValueResult = await queryBuilder
      .select('SUM(asset.currentValue)', 'total')
      .getRawOne();
    const totalValue = parseFloat(totalValueResult?.total || '0');

    // Change from last month
    const lastMonth = subMonths(new Date(), 1);
    const lastMonthStart = startOfMonth(lastMonth);
    const lastMonthEnd = endOfMonth(lastMonth);

    const lastMonthQuery = this.assetRepository.createQueryBuilder('asset');
    this.applyFilters(lastMonthQuery, { ...query, endDate: lastMonthEnd.toISOString() }, user);
    const lastMonthAssets = await lastMonthQuery.getCount();
    const lastMonthValueResult = await lastMonthQuery
      .select('SUM(asset.currentValue)', 'total')
      .getRawOne();
    const lastMonthValue = parseFloat(lastMonthValueResult?.total || '0');

    const assetsChange = lastMonthAssets === 0 ? 100 : ((totalAssets - lastMonthAssets) / lastMonthAssets) * 100;
    const valueChange = lastMonthValue === 0 ? 100 : ((totalValue - lastMonthValue) / lastMonthValue) * 100;

    // Assets by status
    const statusCounts = await queryBuilder
      .select('asset.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('asset.status')
      .getRawMany();
    const assetsByStatus = statusCounts.reduce((acc, curr) => {
      acc[curr.status] = parseInt(curr.count);
      return acc;
    }, {});

    // Assets by condition
    const conditionCounts = await queryBuilder
      .select('asset.condition', 'condition')
      .addSelect('COUNT(*)', 'count')
      .groupBy('asset.condition')
      .getRawMany();
    const assetsByCondition = conditionCounts.reduce((acc, curr) => {
      acc[curr.condition] = parseInt(curr.count);
      return acc;
    }, {});

    // Top Categories
    const topCategories = await queryBuilder
      .leftJoin('asset.category', 'category')
      .select('category.name', 'name')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(asset.currentValue)', 'value')
      .groupBy('category.name')
      .orderBy('value', 'DESC')
      .limit(5)
      .getRawMany();

    // Top Departments
    const topDepartments = await queryBuilder
      .leftJoin('asset.department', 'department')
      .select('department.name', 'name')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(asset.currentValue)', 'value')
      .groupBy('department.name')
      .orderBy('value', 'DESC')
      .limit(5)
      .getRawMany();

    // Recent Activity (Mocked using asset creation for now)
    const recentAssets = await queryBuilder
      .leftJoinAndSelect('asset.createdBy', 'createdBy')
      .orderBy('asset.createdAt', 'DESC')
      .limit(10)
      .getMany();
    const recentActivity = recentAssets.map(asset => ({
      type: 'ASSET_CREATED',
      assetName: asset.name,
      user: asset.createdBy ? `${asset.createdBy.firstName} ${asset.createdBy.lastName}` : 'System',
      timestamp: asset.createdAt.toISOString(),
    }));

    // Alerts
    const now = new Date();
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const warrantiesExpiring = await this.assetRepository.count({
      where: {
        warrantyExpiration: Between(now, next30Days),
      },
    });

    const maintenanceDue = await this.assetRepository.count({
      where: {
        status: AssetStatus.MAINTENANCE,
      },
    });

    const highValueUnassigned = await this.assetRepository.count({
      where: {
        currentValue: MoreThanOrEqual(10000),
        status: AssetStatus.ACTIVE,
      },
    });

    return {
      overview: {
        totalAssets,
        totalValue,
        changeFromLastMonth: {
          assets: parseFloat(assetsChange.toFixed(1)),
          value: parseFloat(valueChange.toFixed(1)),
        },
      },
      assetsByStatus,
      assetsByCondition,
      topCategories: topCategories.map(c => ({
        name: c.name,
        count: parseInt(c.count),
        value: parseFloat(c.value || '0'),
      })),
      topDepartments: topDepartments.map(d => ({
        name: d.name,
        count: parseInt(d.count),
        value: parseFloat(d.value || '0'),
      })),
      recentActivity,
      alerts: {
        warrantiesExpiring,
        maintenanceDue,
        highValueUnassigned,
        overdueTransfers: 0, // Need transfers entity for this
      },
    };
  }

  async getTrends(query: AnalyticsQueryDto, user: any): Promise<TrendsResponse> {
    const cacheKey = `analytics:trends:${JSON.stringify(query)}:${user.role}:${user.id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const trends = await this.calculateTrends(query, user);
    await this.redisService.set(cacheKey, JSON.stringify(trends), 3600); // 1 hour cache
    return trends;
  }

  private async calculateTrends(query: AnalyticsQueryDto, user: any): Promise<TrendsResponse> {
    // Using SQL window functions for trend calculations as requested
    const assetRegistrations = await this.dataSource.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as date, COUNT(*) as count
      FROM assets
      WHERE deleted_at IS NULL
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY date DESC
      LIMIT 12
    `);

    const assetValue = await this.dataSource.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as date, SUM(current_value) as value
      FROM assets
      WHERE deleted_at IS NULL
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY date DESC
      LIMIT 12
    `);

    return {
      assetRegistrations: assetRegistrations.map(r => ({ date: r.date, count: parseInt(r.count) })).reverse(),
      assetValue: assetValue.map(v => ({ date: v.date, value: parseFloat(v.value || '0') })).reverse(),
      transferVolume: [], // Need transfers entity
    };
  }

  async getDistribution(query: AnalyticsQueryDto, user: any): Promise<DistributionResponse> {
    const cacheKey = `analytics:distribution:${JSON.stringify(query)}:${user.role}:${user.id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const distribution = await this.calculateDistribution(query, user);
    await this.redisService.set(cacheKey, JSON.stringify(distribution), 900); // 15 minutes cache
    return distribution;
  }

  private async calculateDistribution(query: AnalyticsQueryDto, user: any): Promise<DistributionResponse> {
    const totalAssets = await this.assetRepository.count();
    
    const byCategory = await this.dataSource.query('SELECT * FROM asset_category_summary');

    const byDepartment = await this.assetRepository.createQueryBuilder('asset')
      .leftJoin('asset.department', 'department')
      .select('department.name', 'department')
      .addSelect('COUNT(*)', 'count')
      .groupBy('department.name')
      .getRawMany();

    const byLocation = await this.assetRepository.createQueryBuilder('asset')
      .select('asset.location', 'location')
      .addSelect('COUNT(*)', 'count')
      .groupBy('asset.location')
      .getRawMany();

    const byStatus = await this.assetRepository.createQueryBuilder('asset')
      .select('asset.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('asset.status')
      .getRawMany();

    return {
      byCategory: byCategory.map(c => ({
        category: c.category_name || 'Uncategorized',
        count: parseInt(c.asset_count),
        value: parseFloat(c.total_value || '0'),
        percentage: totalAssets > 0 ? parseFloat(((parseInt(c.asset_count) / totalAssets) * 100).toFixed(2)) : 0,
      })),
      byDepartment: byDepartment.map(d => ({
        department: d.department || 'No Department',
        count: parseInt(d.count),
        percentage: totalAssets > 0 ? parseFloat(((parseInt(d.count) / totalAssets) * 100).toFixed(2)) : 0,
      })),
      byLocation: byLocation.map(l => ({
        location: l.location || 'Unknown',
        count: parseInt(l.count),
        percentage: totalAssets > 0 ? parseFloat(((parseInt(l.count) / totalAssets) * 100).toFixed(2)) : 0,
      })),
      byStatus: byStatus.map(s => ({
        status: s.status,
        count: parseInt(s.count),
        percentage: totalAssets > 0 ? parseFloat(((parseInt(s.count) / totalAssets) * 100).toFixed(2)) : 0,
      })),
    };
  }

  private applyFilters(queryBuilder: any, query: AnalyticsQueryDto, user: any) {
    if (query.startDate) {
      queryBuilder.andWhere('asset.createdAt >= :startDate', { startDate: query.startDate });
    }
    if (query.endDate) {
      queryBuilder.andWhere('asset.createdAt <= :endDate', { endDate: query.endDate });
    }
    if (query.departmentId) {
      queryBuilder.andWhere('asset.departmentId = :departmentId', { departmentId: query.departmentId });
    }
    if (query.location) {
      queryBuilder.andWhere('asset.location = :location', { location: query.location });
    }

    // RBAC: Users can only see their department data if they are not admin
    if (user.role !== 'ADMIN' && user.departmentId) {
      queryBuilder.andWhere('asset.departmentId = :userDeptId', { userDeptId: user.departmentId });
    }
  }

  async getAssetStats() {
    return this.calculateDashboardStats({}, { role: 'ADMIN' });
  }

  async getTopAssets() {
    return this.assetRepository.find({
      order: { currentValue: 'DESC' },
      take: 10,
      relations: ['category', 'department'],
    });
  }

  async getAlerts() {
    const stats = await this.calculateDashboardStats({}, { role: 'ADMIN' });
    return stats.alerts;
  }

  async getDepartmentAnalytics(id: string) {
    return this.calculateDashboardStats({ departmentId: id }, { role: 'ADMIN' });
  }

  async getLocationAnalytics(location: string) {
    return this.calculateDashboardStats({ location }, { role: 'ADMIN' });
  }

  async getUserAnalytics(userId: string) {
    const assets = await this.assetRepository.find({
      where: { assignedTo: { id: userId } },
      relations: ['category', 'department'],
    });
    return {
      totalAssigned: assets.length,
      totalValue: assets.reduce((sum, a) => sum + (parseFloat(a.currentValue as any) || 0), 0),
      assets,
    };
  }
}
