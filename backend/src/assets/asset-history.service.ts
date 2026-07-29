import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, EntityManager, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import {
  AssetHistoryAction,
  AssetHistoryEvent,
} from './entities/asset-history-event.entity';

export interface RecordHistoryInput {
  assetId: string;
  action: AssetHistoryAction;
  description: string;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  performedById?: string;
}

export interface AssetHistoryFilters {
  action?: AssetHistoryAction;
  startDate?: string;
  endDate?: string;
  search?: string;
}

@Injectable()
export class AssetHistoryService {
  constructor(
    @InjectRepository(AssetHistoryEvent)
    private readonly historyRepo: Repository<AssetHistoryEvent>,
  ) {}

  /**
   * Persist a history event. Pass `manager` to enlist the write in the caller's
   * transaction so the event and the asset mutation commit together.
   */
  async record(
    input: RecordHistoryInput,
    manager?: EntityManager,
  ): Promise<AssetHistoryEvent> {
    const repo = manager ? manager.getRepository(AssetHistoryEvent) : this.historyRepo;
    const event = repo.create({
      assetId: input.assetId,
      action: input.action,
      description: input.description,
      previousValue: input.previousValue ?? null,
      newValue: input.newValue ?? null,
      performedById: input.performedById,
    });
    return repo.save(event);
  }

  async findByAsset(
    assetId: string,
    filters?: AssetHistoryFilters,
  ): Promise<AssetHistoryEvent[]> {
    const where: Record<string, unknown> = { assetId };

    if (filters?.action) where.action = filters.action;

    const start = filters?.startDate ? new Date(filters.startDate) : undefined;
    const end = filters?.endDate ? new Date(filters.endDate) : undefined;
    if (start && end) where.createdAt = Between(start, end);
    else if (start) where.createdAt = MoreThanOrEqual(start);
    else if (end) where.createdAt = LessThanOrEqual(end);

    const events = await this.historyRepo.find({
      where,
      relations: ['performedBy'],
      order: { createdAt: 'DESC' },
    });

    if (!filters?.search) return events;

    const needle = filters.search.toLowerCase();
    return events.filter((e) => e.description?.toLowerCase().includes(needle));
  }
}
