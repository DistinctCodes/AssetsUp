import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from './notification-preference.entity';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @InjectRepository(NotificationPreference)
    private readonly preferencesRepo: Repository<NotificationPreference>,
  ) {}

  async createDefaultsForUser(userId: string): Promise<NotificationPreference> {
    const existing = await this.preferencesRepo.findOne({ where: { userId } });
    if (existing) {
      return existing;
    }

    return this.preferencesRepo.save(
      this.preferencesRepo.create({
        userId,
        assetCreated: true,
        assetTransferred: true,
        maintenanceDue: true,
        warrantyExpiring: true,
      }),
    );
  }

  async getForUser(userId: string): Promise<NotificationPreference> {
    return this.createDefaultsForUser(userId);
  }

  async updateForUser(userId: string, dto: UpdateNotificationPreferencesDto): Promise<NotificationPreference> {
    const current = await this.createDefaultsForUser(userId);
    Object.assign(current, dto);
    return this.preferencesRepo.save(current);
  }
}
