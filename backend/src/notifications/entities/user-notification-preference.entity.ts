import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationEvent } from '../enums/notification-event.enum';

@Entity('user_notification_preferences')
export class UserNotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'jsonb', default: defaultPreferences })
  emailPreferences: Record<NotificationEvent, boolean>;

  @Column({ type: 'jsonb', default: defaultPreferences })
  inAppPreferences: Record<NotificationEvent, boolean>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

function defaultPreferences(): Record<NotificationEvent, boolean> {
  return {
    [NotificationEvent.ASSET_TRANSFERRED]: true,
    [NotificationEvent.ASSET_STATUS_CHANGED]: true,
    [NotificationEvent.WORK_ORDER_ASSIGNED]: true,
    [NotificationEvent.WORK_ORDER_COMPLETED]: true,
    [NotificationEvent.MAINTENANCE_DUE]: true,
    [NotificationEvent.WARRANTY_EXPIRING]: true,
    [NotificationEvent.CHECKOUT_OVERDUE]: true,
    [NotificationEvent.CONTRACT_EXPIRING]: true,
    [NotificationEvent.LOW_STOCK]: true,
    [NotificationEvent.BOOKING_CONFIRMED]: true,
    [NotificationEvent.BOOKING_CANCELLED]: true,
  };
}
