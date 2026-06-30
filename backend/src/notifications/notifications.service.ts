import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dtos/create-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create(dto);
    return this.notificationRepository.save(notification);
  }

  async findByUserId(
    userId: string,
    isRead?: boolean,
  ): Promise<Notification[]> {
    const where: any = { userId };
    if (isRead !== undefined) {
      where.isRead = isRead;
    }
    return this.notificationRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });
    if (!notification) {
      throw new Error('Notification not found');
    }
    notification.isRead = true;
    notification.readAt = new Date();
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  async sendToUser(
    userId: string,
    type: string,
    message: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      event: type as any,
      title: type,
      message,
      emailTemplate: '',
      emailSubject: '',
      emailContext: {},
    } as any);
  }

  async findByUser(userId: string): Promise<Notification[]> {
    return this.findByUserId(userId);
  }

  async markRead(id: string, userId: string): Promise<Notification | null> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });
    if (!notification) return null;
    return this.markAsRead(id);
  }

  async markAllRead(userId: string): Promise<void> {
    return this.markAllAsRead(userId);
  }
}
