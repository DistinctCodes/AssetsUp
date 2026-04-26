import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditLogFiltersDto } from './dto/audit-log-filters.dto';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  create(logEntry: Partial<AuditLog>): Promise<AuditLog> {
    return this.auditLogRepository.save(this.auditLogRepository.create(logEntry));
  }

  async findAll(filters: AuditLogFiltersDto) {
    const query = this.auditLogRepository.createQueryBuilder('audit_log');

    if (filters.userId) {
      query.andWhere('audit_log.userId = :userId', { userId: filters.userId });
    }

    if (filters.method) {
      query.andWhere('audit_log.method = :method', { method: filters.method.toUpperCase() });
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const [items, total] = await query
      .orderBy('audit_log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }
}
