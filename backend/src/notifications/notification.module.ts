import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { UserNotificationPreference } from './entities/user-notification-preference.entity';
import { NotificationsService } from './notifications.service';
import { NotificationDispatchService } from './notification-dispatch.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, UserNotificationPreference]),
    QueueModule,
  ],
  providers: [NotificationsService, NotificationDispatchService],
  exports: [NotificationsService, NotificationDispatchService, TypeOrmModule],
})
export class NotificationModule {}
