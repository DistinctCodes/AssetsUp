import { NotificationEvent } from '../enums/notification-event.enum';

export class CreateNotificationDto {
  userId: string;
  event: NotificationEvent;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}
