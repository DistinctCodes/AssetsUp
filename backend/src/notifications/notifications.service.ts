import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Notification, NotificationType } from './entities/notification.entity';

export interface CreateNotificationDto {
  userId: string;
  title: string;
  message?: string;
  type?: NotificationType;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateNotificationDto) {
    const notification = this.notificationRepo.create(dto);
    const saved = await this.notificationRepo.save(notification);
    this.eventEmitter.emit('notification.new', saved);
    return saved;
  }

  async findByUser(userId: string) {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(id: string, userId?: string) {
    const notification = await this.notificationRepo.findOne({
      where: userId ? { id, userId } : { id },
    });
    if (!notification) return null;
    notification.isRead = true;
    return this.notificationRepo.save(notification);
  }

  /** The caller's own notifications, newest first. */
  async findPage(
    userId: string,
    query: { page?: number; limit?: number; unreadOnly?: boolean },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const [items, total] = await this.notificationRepo.findAndCount({
      where: query.unreadOnly ? { userId, isRead: false } : { userId },
      order: { createdAt: 'DESC', id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async unreadCount(userId: string) {
    return { count: await this.notificationRepo.count({ where: { userId, isRead: false } }) };
  }

  /** Marks one of the caller's notifications read; 404 if it isn't theirs. */
  async markOwnAsRead(id: string, userId: string) {
    const updated = await this.markAsRead(id, userId);
    if (!updated) throw new NotFoundException(`Notification ${id} not found`);
    return updated;
  }

  async markAllAsRead(userId: string) {
    const result = await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return { updated: result.affected ?? 0 };
  }

  async removeOwn(id: string, userId: string) {
    const result = await this.notificationRepo.delete({ id, userId });
    if (!result.affected) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    return { deleted: true };
  }
}
