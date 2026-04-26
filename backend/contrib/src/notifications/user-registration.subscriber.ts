import { DataSource, EventSubscriber, EntitySubscriberInterface, InsertEvent } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { User } from '../users/user.entity';
import { NotificationPreference } from './notification-preference.entity';

@Injectable()
@EventSubscriber()
export class UserRegistrationSubscriber implements EntitySubscriberInterface<User> {
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return User;
  }

  async afterInsert(event: InsertEvent<User>): Promise<void> {
    if (!event.entity?.id) {
      return;
    }

    const repo = event.manager.getRepository(NotificationPreference);
    const existing = await repo.findOne({ where: { userId: event.entity.id } });
    if (existing) {
      return;
    }

    await repo.insert({
      userId: event.entity.id,
      assetCreated: true,
      assetTransferred: true,
      maintenanceDue: true,
      warrantyExpiring: true,
    });
  }
}
