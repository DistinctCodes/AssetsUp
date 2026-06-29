import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';
import { CreateActivityLogDto } from './dtos/create-activity-log.dto';
import { ActivityLogQueryDto } from './dtos/activity-log-query.dto';

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
  ) {}

  async create(dto: CreateActivityLogDto): Promise<ActivityLog> {
    const log = this.activityLogRepository.create(dto);
    return this.activityLogRepository.save(log);
  }

  async findAll(
    query: ActivityLogQueryDto,
  ): Promise<{ data: ActivityLog[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
    } = query;
    const qb = this.activityLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('log.createdAt', 'DESC');

    if (userId) qb.andWhere('log.userId = :userId', { userId });
    if (action) qb.andWhere('log.action = :action', { action });
    if (entityType) qb.andWhere('log.entityType = :entityType', { entityType });
    if (entityId) qb.andWhere('log.entityId = :entityId', { entityId });
    if (startDate) qb.andWhere('log.createdAt >= :startDate', { startDate });
    if (endDate) qb.andWhere('log.createdAt <= :endDate', { endDate });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findById(id: string): Promise<ActivityLog> {
    const log = await this.activityLogRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!log) throw new NotFoundException('Activity log not found');
    return log;
  }

  async remove(id: string): Promise<void> {
    const log = await this.findById(id);
    await this.activityLogRepository.softDelete(log.id);
  }
}
