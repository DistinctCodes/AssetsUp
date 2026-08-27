import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';

export interface AuditLogQuery {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  action?: AuditAction;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface AuditLogListResult {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async logAction(params: {
    action: AuditAction | string;
    entityType: string;
    entityId: string;
    actorId?: string;
    previousValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const entry = this.auditLogRepo.create({
      action: params.action as AuditAction,
      entityType: params.entityType,
      entityId: params.entityId,
      actorId: params.actorId,
      previousValue: params.previousValue,
      newValue: params.newValue,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
    const saved = await this.auditLogRepo.save(entry);
    // Invalidate list cache on write
    await this.cacheManager.del('audit-logs:list');
    return saved;
  }

  async findAll(query: AuditLogQuery): Promise<AuditLogListResult> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const cacheKey = `audit-logs:list:${JSON.stringify(query)}`;

    const cached = await this.cacheManager.get<AuditLogListResult>(cacheKey);
    if (cached) return cached;

    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.entityType)
      qb.andWhere('log.entityType = :entityType', {
        entityType: query.entityType,
      });
    if (query.entityId)
      qb.andWhere('log.entityId = :entityId', { entityId: query.entityId });
    if (query.actorId)
      qb.andWhere('log.actorId = :actorId', { actorId: query.actorId });
    if (query.action)
      qb.andWhere('log.action = :action', { action: query.action });
    if (query.from) qb.andWhere('log.createdAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('log.createdAt <= :to', { to: query.to });

    const [items, total] = await qb.getManyAndCount();
    const result: AuditLogListResult = {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    await this.cacheManager.set(cacheKey, result, 30000); // 30s TTL
    return result;
  }

  async findById(id: string) {
    const log = await this.auditLogRepo.findOne({ where: { id } });
    if (!log) throw new NotFoundException(`Audit log ${id} not found`);
    return log;
  }
}
