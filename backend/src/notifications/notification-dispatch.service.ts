import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEvent } from './enums/notification-event.enum';
import { UserNotificationPreference } from './entities/user-notification-preference.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from './notifications.service';
import { QueueService } from '../queue/queue.service';

export interface DispatchNotificationDto {
  userId: string;
  event: NotificationEvent;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  emailTemplate: string;
  emailSubject: string;
  emailContext: Record<string, any>;
}

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    @InjectRepository(UserNotificationPreference)
    private readonly preferenceRepository: Repository<UserNotificationPreference>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly queueService: QueueService,
  ) {}

  async dispatch(dto: DispatchNotificationDto): Promise<void> {
    const preferences = await this.getUserPreferences(dto.userId);
    const user = await this.getUserEmail(dto.userId);

    if (!user) {
      this.logger.warn(`User ${dto.userId} not found, skipping notification`);
      return;
    }

    const emailEnabled = preferences?.emailPreferences?.[dto.event] ?? true;
    const inAppEnabled = preferences?.inAppPreferences?.[dto.event] ?? true;

    if (inAppEnabled) {
      await this.notificationsService.create({
        userId: dto.userId,
        event: dto.event,
        title: dto.title,
        message: dto.message,
        entityType: dto.entityType,
        entityId: dto.entityId,
        metadata: dto.metadata,
      });
      this.logger.log(
        `In-app notification sent to user ${dto.userId} for event ${dto.event}`,
      );
    }

    if (emailEnabled && user.email) {
      await this.queueService.sendEmail({
        to: user.email,
        subject: dto.emailSubject,
        template: dto.emailTemplate,
        context: dto.emailContext,
      });
      this.logger.log(
        `Email queued for user ${dto.userId} (${user.email}) for event ${dto.event}`,
      );
    }
  }

  private async getUserPreferences(
    userId: string,
  ): Promise<UserNotificationPreference | null> {
    try {
      return await this.preferenceRepository.findOne({
        where: { userId },
        relations: ['user'],
      });
    } catch {
      this.logger.warn(
        `Failed to fetch preferences for user ${userId}, using defaults`,
      );
      return null;
    }
  }

  private async getUserEmail(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { id: userId },
      });
    } catch {
      this.logger.warn(`Failed to fetch user ${userId}`);
      return null;
    }
  }
}
