import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationPreference } from './notification-preference.entity';
import { User } from '../users/user.entity';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UserRegistrationSubscriber } from './user-registration.subscriber';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationPreference, User])],
  controllers: [NotificationPreferencesController],
  providers: [NotificationPreferencesService, UserRegistrationSubscriber],
  exports: [NotificationPreferencesService],
})
export class NotificationsModule {}
