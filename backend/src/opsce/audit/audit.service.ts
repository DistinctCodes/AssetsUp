import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface LogDto {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(dto: LogDto): Promise<AuditLog> {
    const entry = this.repo.create(dto);
    return this.repo.save(entry);
  }

  async findByResource(
    resourceType: string,
    resourceId: string,
  ): Promise<AuditLog[]> {
    return this.repo.find({
      where: { resourceType, resourceId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: string): Promise<AuditLog[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(dto: QueryAuditDto) {
    const { userId, resourceType, resourceId, from, to, page = 1, limit = 20 } = dto;

    const where: FindOptionsWhere<AuditLog> = {};
    if (userId) where.userId = userId;
    if (resourceType) where.resourceType = resourceType;
    if (resourceId) where.resourceId = resourceId;
    if (from || to) {
      where.createdAt = Between(
        from ? new Date(from) : new Date(0),
        to ? new Date(to) : new Date(),
      );
    }

    const [data, total] = await this.auditRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { total, page, data };
  }
}
