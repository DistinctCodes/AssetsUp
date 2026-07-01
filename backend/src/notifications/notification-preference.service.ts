import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from './notification-preference.entity';

@Injectable()
export class NotificationPreferenceService {
  constructor(
    @InjectRepository(NotificationPreference)
    private readonly repo: Repository<NotificationPreference>,
  ) {}

  async findByUser(userId: string): Promise<NotificationPreference[]> {
    return this.repo.find({ where: { userId } });
  }

  async upsert(
    userId: string,
    channel: string,
    enabled: boolean,
    events?: string[],
  ): Promise<NotificationPreference> {
    let pref = await this.repo.findOne({ where: { userId, channel } });
    if (!pref) {
      pref = this.repo.create({ userId, channel });
    }
    pref.enabled = enabled;
    if (events !== undefined) pref.events = events;
    return this.repo.save(pref);
  }

  async upsertAll(
    userId: string,
    preferences: { channel: string; enabled: boolean; events?: string[] }[],
  ): Promise<NotificationPreference[]> {
    return Promise.all(
      preferences.map((p) =>
        this.upsert(userId, p.channel, p.enabled, p.events),
      ),
    );
  }

  async reset(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }
}
