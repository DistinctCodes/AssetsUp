import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Asset } from './asset.entity';
import { AssetHistory } from './asset-history.entity';
import { AssetHistoryAction, AssetStatus } from './enums';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetsRepo: Repository<Asset>,
    @InjectRepository(AssetHistory)
    private readonly historyRepo: Repository<AssetHistory>,
  ) {}

  async bulkUpdateStatus(
    ids: string[],
    status: AssetStatus,
    performedById: string | null,
  ): Promise<{ updated: number }> {
    const assets = await this.assetsRepo.find({ where: { id: In(ids), deletedAt: IsNull() } });

    if (assets.length === 0) {
      return { updated: 0 };
    }

    const updates = assets.map((asset) => ({ ...asset, status }));
    await this.assetsRepo.save(updates);

    await this.historyRepo.insert(
      assets.map((asset) => ({
        assetId: asset.id,
        action: AssetHistoryAction.STATUS_CHANGED,
        description: `Status changed from ${asset.status} to ${status}`,
        previousValue: { status: asset.status },
        newValue: { status },
        performedById,
      })),
    );

    return { updated: assets.length };
  }

  async bulkDelete(ids: string[], performedById: string | null): Promise<{ deleted: number }> {
    const assets = await this.assetsRepo.find({ where: { id: In(ids), deletedAt: IsNull() } });

    if (assets.length === 0) {
      return { deleted: 0 };
    }

    const targetIds = assets.map((asset) => asset.id);
    await this.assetsRepo.softDelete(targetIds);

    await this.historyRepo.insert(
      assets.map((asset) => ({
        assetId: asset.id,
        action: AssetHistoryAction.DELETED,
        description: 'Asset soft-deleted in bulk operation',
        previousValue: { deletedAt: null },
        newValue: { deletedAt: new Date().toISOString() },
        performedById,
      })),
    );

    return { deleted: assets.length };
  }

  async bulkTransferDepartment(
    ids: string[],
    departmentId: string,
    performedById: string | null,
  ): Promise<{ updated: number }> {
    const assets = await this.assetsRepo.find({ where: { id: In(ids), deletedAt: IsNull() } });

    if (assets.length === 0) {
      return { updated: 0 };
    }

    const updates = assets.map((asset) => ({ ...asset, departmentId }));
    await this.assetsRepo.save(updates);

    await this.historyRepo.insert(
      assets.map((asset) => ({
        assetId: asset.id,
        action: AssetHistoryAction.TRANSFERRED,
        description: `Asset transferred from ${asset.departmentId || 'unassigned'} to ${departmentId}`,
        previousValue: { departmentId: asset.departmentId },
        newValue: { departmentId },
        performedById,
      })),
    );

    return { updated: assets.length };
  }

  async updateTags(id: string, tags: string[], performedById: string | null): Promise<Asset> {
    const asset = await this.assetsRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const previousTags = asset.tags || [];
    asset.tags = tags;
    const updated = await this.assetsRepo.save(asset);

    await this.historyRepo.insert({
      assetId: asset.id,
      action: AssetHistoryAction.TAGS_UPDATED,
      description: 'Asset tags updated',
      previousValue: { tags: previousTags },
      newValue: { tags },
      performedById,
    });

    return updated;
  }

  async search(q: string): Promise<Asset[]> {
    const term = (q || '').trim();
    if (!term) {
      return [];
    }

    const contains = `%${term}%`;

    return this.assetsRepo
      .createQueryBuilder('asset')
      .where('asset.deletedAt IS NULL')
      .andWhere(
        `(asset.name ILIKE :contains
          OR asset.assetId ILIKE :contains
          OR asset.serialNumber ILIKE :contains
          OR asset.manufacturer ILIKE :contains
          OR asset.model ILIKE :contains
          OR asset.description ILIKE :contains
          OR array_to_string(asset.tags, ' ') ILIKE :contains)`,
        { contains },
      )
      .addSelect(
        `CASE
          WHEN asset.assetId = :exact THEN 1000
          WHEN asset.assetId ILIKE :startsWith THEN 600
          ELSE 0
        END
        + CASE WHEN asset.name ILIKE :contains THEN 120 ELSE 0 END
        + CASE WHEN asset.serialNumber ILIKE :contains THEN 100 ELSE 0 END
        + CASE WHEN asset.manufacturer ILIKE :contains THEN 80 ELSE 0 END
        + CASE WHEN asset.model ILIKE :contains THEN 80 ELSE 0 END
        + CASE WHEN asset.description ILIKE :contains THEN 40 ELSE 0 END
        + CASE WHEN array_to_string(asset.tags, ' ') ILIKE :contains THEN 60 ELSE 0 END`,
        'relevance',
      )
      .setParameters({ exact: term, startsWith: `${term}%`, contains })
      .orderBy('relevance', 'DESC')
      .addOrderBy('asset.updatedAt', 'DESC')
      .getMany();
  }
}
