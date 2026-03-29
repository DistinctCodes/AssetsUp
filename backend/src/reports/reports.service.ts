import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../assets/asset.entity';
import { AssetCondition, AssetStatus } from '../assets/enums';
import { Maintenance, MaintenanceStatus } from '../assets/maintenance.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetsRepo: Repository<Asset>,
    @InjectRepository(Maintenance)
    private readonly maintenanceRepo: Repository<Maintenance>,
  ) {}

  async getSummary() {
    const [summaryRow, statusRows, byCategory, byDepartment, recent, maintenanceDueRow] =
      await Promise.all([
        this.assetsRepo
          .createQueryBuilder('a')
          .select('COUNT(*)', 'total')
          .addSelect('COALESCE(SUM(a.purchasePrice), 0)', 'totalValue')
          .addSelect(
            "COALESCE(AVG(DATE_PART('day', CURRENT_DATE - a.purchaseDate)), 0)",
            'averageAgeInDays',
          )
          .addSelect(
            "SUM(CASE WHEN a.warrantyExpiration BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END)",
            'warrantyExpiringCount',
          )
          .getRawOne<{
            total: string;
            totalValue: string;
            averageAgeInDays: string;
            warrantyExpiringCount: string;
          }>(),
        this.assetsRepo
          .createQueryBuilder('a')
          .select('a.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .groupBy('a.status')
          .getRawMany<{ status: string; count: string }>(),
        this.assetsRepo
          .createQueryBuilder('a')
          .leftJoin('a.category', 'c')
          .select('COALESCE(c.name, :uncategorised)', 'name')
          .setParameter('uncategorised', 'Uncategorised')
          .addSelect('COUNT(*)', 'count')
          .groupBy('c.name')
          .getRawMany<{ name: string; count: string }>()
          .then((rows) => rows.map((r) => ({ name: r.name, count: Number(r.count) }))),
        this.assetsRepo
          .createQueryBuilder('a')
          .leftJoin('a.department', 'd')
          .select('COALESCE(d.name, :unassigned)', 'name')
          .setParameter('unassigned', 'Unassigned')
          .addSelect('COUNT(*)', 'count')
          .groupBy('d.name')
          .getRawMany<{ name: string; count: string }>()
          .then((rows) => rows.map((r) => ({ name: r.name, count: Number(r.count) }))),
        this.assetsRepo
          .createQueryBuilder('a')
          .leftJoinAndSelect('a.category', 'c')
          .leftJoinAndSelect('a.department', 'd')
          .orderBy('a.createdAt', 'DESC')
          .take(5)
          .getMany(),
        this.maintenanceRepo
          .createQueryBuilder('m')
          .select('COUNT(*)', 'maintenanceDueCount')
          .where('m.status = :status', { status: MaintenanceStatus.SCHEDULED })
          .andWhere(
            "m.scheduledDate BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'",
          )
          .getRawOne<{ maintenanceDueCount: string }>(),
      ]);

    const byStatus = Object.values(AssetStatus).reduce(
      (acc, s) => {
        acc[s] = 0;
        return acc;
      },
      {} as Record<AssetStatus, number>,
    );

    for (const { status, count } of statusRows) {
      byStatus[status as AssetStatus] = Number(count);
    }

    return {
      total: Number(summaryRow?.total ?? 0),
      totalValue: Number(summaryRow?.totalValue ?? 0),
      averageAgeInDays: Number(summaryRow?.averageAgeInDays ?? 0),
      maintenanceDueCount: Number(maintenanceDueRow?.maintenanceDueCount ?? 0),
      warrantyExpiringCount: Number(summaryRow?.warrantyExpiringCount ?? 0),
      byStatus,
      byCategory,
      byDepartment,
      recent,
    };
  }

  async getByDepartment() {
    const rows = await this.assetsRepo
      .createQueryBuilder('a')
      .leftJoin('a.department', 'd')
      .select('COALESCE(d.name, :unassigned)', 'departmentName')
      .setParameter('unassigned', 'Unassigned')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(a.purchasePrice), 0)', 'totalValue')
      .addSelect(
        'SUM(CASE WHEN a.status = :active THEN 1 ELSE 0 END)',
        'activeCount',
      )
      .addSelect(
        'SUM(CASE WHEN a.status = :assigned THEN 1 ELSE 0 END)',
        'assignedCount',
      )
      .addSelect(
        'SUM(CASE WHEN a.status = :maintenance THEN 1 ELSE 0 END)',
        'maintenanceCount',
      )
      .addSelect(
        'SUM(CASE WHEN a.status = :retired THEN 1 ELSE 0 END)',
        'retiredCount',
      )
      .setParameters({
        active: AssetStatus.ACTIVE,
        assigned: AssetStatus.ASSIGNED,
        maintenance: AssetStatus.MAINTENANCE,
        retired: AssetStatus.RETIRED,
      })
      .groupBy('d.name')
      .getRawMany<{
        departmentName: string;
        count: string;
        totalValue: string;
        activeCount: string;
        assignedCount: string;
        maintenanceCount: string;
        retiredCount: string;
      }>();

    return rows.map((row) => ({
      departmentName: row.departmentName,
      total: Number(row.count),
      totalValue: Number(row.totalValue),
      byStatus: {
        [AssetStatus.ACTIVE]: Number(row.activeCount),
        [AssetStatus.ASSIGNED]: Number(row.assignedCount),
        [AssetStatus.MAINTENANCE]: Number(row.maintenanceCount),
        [AssetStatus.RETIRED]: Number(row.retiredCount),
      },
    }));
  }

  async getByCategory() {
    const rows = await this.assetsRepo
      .createQueryBuilder('a')
      .leftJoin('a.category', 'c')
      .select('COALESCE(c.name, :uncategorised)', 'categoryName')
      .setParameter('uncategorised', 'Uncategorised')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(a.purchasePrice), 0)', 'totalValue')
      .addSelect('SUM(CASE WHEN a.condition = :newCondition THEN 1 ELSE 0 END)', 'newCount')
      .addSelect('SUM(CASE WHEN a.condition = :goodCondition THEN 1 ELSE 0 END)', 'goodCount')
      .addSelect('SUM(CASE WHEN a.condition = :fairCondition THEN 1 ELSE 0 END)', 'fairCount')
      .addSelect('SUM(CASE WHEN a.condition = :poorCondition THEN 1 ELSE 0 END)', 'poorCount')
      .addSelect(
        'SUM(CASE WHEN a.condition = :damagedCondition THEN 1 ELSE 0 END)',
        'damagedCount',
      )
      .setParameters({
        newCondition: AssetCondition.NEW,
        goodCondition: AssetCondition.GOOD,
        fairCondition: AssetCondition.FAIR,
        poorCondition: AssetCondition.POOR,
        damagedCondition: AssetCondition.DAMAGED,
      })
      .groupBy('c.name')
      .getRawMany<{
        categoryName: string;
        count: string;
        totalValue: string;
        newCount: string;
        goodCount: string;
        fairCount: string;
        poorCount: string;
        damagedCount: string;
      }>();

    return rows.map((row) => ({
      categoryName: row.categoryName,
      total: Number(row.count),
      totalValue: Number(row.totalValue),
      byCondition: {
        [AssetCondition.NEW]: Number(row.newCount),
        [AssetCondition.GOOD]: Number(row.goodCount),
        [AssetCondition.FAIR]: Number(row.fairCount),
        [AssetCondition.POOR]: Number(row.poorCount),
        [AssetCondition.DAMAGED]: Number(row.damagedCount),
      },
    }));
  }

  async getMaintenanceHistory(from?: string, to?: string) {
    const qb = this.maintenanceRepo
      .createQueryBuilder('m')
      .leftJoin(Asset, 'a', 'a.id = m.assetId')
      .select('m.id', 'id')
      .addSelect('a.name', 'assetName')
      .addSelect('m.type', 'type')
      .addSelect('m.cost', 'cost')
      .addSelect('m.status', 'status')
      .addSelect('m.scheduledDate', 'scheduledDate')
      .addSelect('m.completedDate', 'completedDate')
      .orderBy('m.scheduledDate', 'DESC');

    if (from) {
      qb.andWhere('m.scheduledDate >= :from', { from });
    }
    if (to) {
      qb.andWhere('m.scheduledDate <= :to', { to });
    }

    const rows = await qb.getRawMany<{
      id: string;
      assetName: string;
      type: string;
      cost: string | null;
      status: string;
      scheduledDate: string;
      completedDate: string | null;
    }>();

    return rows.map((row) => ({
      id: row.id,
      assetName: row.assetName,
      type: row.type,
      cost: row.cost === null ? null : Number(row.cost),
      status: row.status,
      scheduledDate: row.scheduledDate,
      completedDate: row.completedDate,
    }));
  }

  async exportAssets(filters: AssetFiltersDto): Promise<Asset[]> {
    const { search, status, condition, categoryId, departmentId } = filters;
    const qb = this.assetsRepo
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.department', 'department')
      .leftJoinAndSelect('asset.assignedTo', 'assignedTo')
      .leftJoinAndSelect('asset.createdBy', 'createdBy')
      .leftJoinAndSelect('asset.updatedBy', 'updatedBy');

    if (search) {
      qb.andWhere(
        '(asset.name ILIKE :search OR asset.assetId ILIKE :search OR asset.serialNumber ILIKE :search OR asset.manufacturer ILIKE :search OR asset.model ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (status) qb.andWhere('asset.status = :status', { status });
    if (condition) qb.andWhere('asset.condition = :condition', { condition });
    if (categoryId) qb.andWhere('category.id = :categoryId', { categoryId });
    if (departmentId) qb.andWhere('department.id = :departmentId', { departmentId });

    qb.orderBy('asset.createdAt', 'DESC');

    return qb.getMany();
  }
}
