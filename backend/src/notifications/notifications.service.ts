import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly gateway: NotificationsGateway,
  ) {}

  async sendToUser(
    userId: string,
    type: string,
    message: string,
  ): Promise<Notification> {
    const notification = this.repo.create({ userId, type, message });
    const saved = await this.repo.save(notification);
    this.gateway.sendToUser(userId, 'notification', {
      id: saved.id,
      type,
      message,
      createdAt: saved.createdAt,
    });
    return saved;
  }

  async findByUser(userId: string): Promise<Notification[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async markRead(id: string, userId: string): Promise<Notification | null> {
    const notification = await this.repo.findOne({ where: { id, userId } });
    if (!notification) return null;
    notification.read = true;
    return this.repo.save(notification);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.update({ userId, read: false }, { read: true });
  }
}
