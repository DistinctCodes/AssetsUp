import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../assets/asset.entity';
import { AssetStatus } from '../assets/enums';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetsRepo: Repository<Asset>,
  ) {}

  async getSummary() {
    const total = await this.assetsRepo.count();

    // By status
    const statusRows = await this.assetsRepo
      .createQueryBuilder('a')
      .select('a.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('a.status')
      .getRawMany<{ status: string; count: string }>();

    const byStatus = Object.values(AssetStatus).reduce(
      (acc, s) => { acc[s] = 0; return acc; },
      {} as Record<AssetStatus, number>,
    );
    for (const { status, count } of statusRows) {
      byStatus[status as AssetStatus] = Number(count);
    }

    // By category
    const byCategory = await this.assetsRepo
      .createQueryBuilder('a')
      .leftJoin('a.category', 'c')
      .select('COALESCE(c.name, :uncategorised)', 'name')
      .setParameter('uncategorised', 'Uncategorised')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.name')
      .getRawMany<{ name: string; count: string }>()
      .then((rows) => rows.map((r) => ({ name: r.name, count: Number(r.count) })));

    // By department
    const byDepartment = await this.assetsRepo
      .createQueryBuilder('a')
      .leftJoin('a.department', 'd')
      .select('COALESCE(d.name, :unassigned)', 'name')
      .setParameter('unassigned', 'Unassigned')
      .addSelect('COUNT(*)', 'count')
      .groupBy('d.name')
      .getRawMany<{ name: string; count: string }>()
      .then((rows) => rows.map((r) => ({ name: r.name, count: Number(r.count) })));

    // Recent (last 5 created)
    const recent = await this.assetsRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.category', 'c')
      .leftJoinAndSelect('a.department', 'd')
      .orderBy('a.createdAt', 'DESC')
      .take(5)
      .getMany();

    return { total, byStatus, byCategory, byDepartment, recent };
  }
}
