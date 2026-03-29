import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './audit-log.entity';
import { AuditLogFiltersDto } from './dto/audit-log-filters.dto';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import { User } from '../users/user.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(
    action: AuditAction,
    entityType: string,
    entityId: string | null,
    user: User | null,
    ipAddress?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.repo.save(this.repo.create({ action, entityType, entityId, user, ipAddress: ipAddress ?? null, metadata: metadata ?? null }));
  }

  async findAll(filters: AuditLogFiltersDto): Promise<PaginatedResponse<AuditLog>> {
    const { action, entityType, userId, page = 1, limit = 20 } = filters;

    const qb = this.repo.createQueryBuilder('log').leftJoinAndSelect('log.user', 'user');

    if (action) qb.andWhere('log.action = :action', { action });
    if (entityType) qb.andWhere('log.entityType = :entityType', { entityType });
    if (userId) qb.andWhere('user.id = :userId', { userId });

    qb.orderBy('log.createdAt', 'DESC').skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return PaginatedResponse.of(data, total, page, limit);
  }
}
