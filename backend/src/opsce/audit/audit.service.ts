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

  async findByResource(resourceType: string, resourceId: string): Promise<AuditLog[]> {
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
}
