import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from './asset.entity';
import { AssetHistory } from './asset-history.entity';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetHistoryAction } from './enums';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
    @InjectRepository(AssetHistory)
    private readonly historyRepo: Repository<AssetHistory>,
  ) {}

  async findOne(id: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({
      where: { id },
      relations: ['history'],
      withDeleted: true,
    });
    if (!asset) {
      throw new NotFoundException(`Asset with id "${id}" not found`);
    }
    return asset;
  }

  async update(id: string, dto: UpdateAssetDto, performedBy: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({
      where: { id },
      relations: ['history'],
    });
    if (!asset) {
      throw new NotFoundException(`Asset with id "${id}" not found`);
    }

    const changes: Record<string, unknown> = {};
    for (const key of Object.keys(dto)) {
      const k = key as keyof UpdateAssetDto;
      if (dto[k] !== undefined && asset[k] !== dto[k]) {
        changes[k] = { old: asset[k], new: dto[k] };
        (asset as unknown as Record<string, unknown>)[k] = dto[k];
      }
    }

    const updated = await this.assetRepo.save(asset);

    if (Object.keys(changes).length > 0) {
      const history = this.historyRepo.create({
        asset: updated,
        action: AssetHistoryAction.UPDATED,
        changes,
        performedBy,
      });
      await this.historyRepo.save(history);
    }

    return updated;
  }

  async softDelete(id: string, performedBy: string): Promise<void> {
    const asset = await this.assetRepo.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`Asset with id "${id}" not found`);
    }

    await this.assetRepo.softDelete(id);

    const history = this.historyRepo.create({
      asset,
      action: AssetHistoryAction.DELETED,
      changes: null,
      performedBy,
    });
    await this.historyRepo.save(history);
  }

  async restore(id: string, performedBy: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!asset) {
      throw new NotFoundException(`Asset with id "${id}" not found`);
    }

    await this.assetRepo.restore(id);

    const restored = await this.assetRepo.findOneOrFail({ where: { id } });

    const history = this.historyRepo.create({
      asset: restored,
      action: AssetHistoryAction.RESTORED,
      changes: null,
      performedBy,
    });
    await this.historyRepo.save(history);

    return restored;
  }
}

