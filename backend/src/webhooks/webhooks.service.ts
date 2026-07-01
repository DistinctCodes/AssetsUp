import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Webhook } from './webhook.entity';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(Webhook)
    private readonly repo: Repository<Webhook>,
  ) {}

  async create(
    userId: string,
    name: string,
    url: string,
    events: string[],
    secret?: string,
  ): Promise<Webhook> {
    const secretHash = secret ? await bcrypt.hash(secret, 10) : undefined;
    const webhook = this.repo.create({ userId, name, url, events, secretHash });
    return this.repo.save(webhook);
  }

  async findByUser(userId: string): Promise<Webhook[]> {
    return this.repo.find({ where: { userId, isActive: true } });
  }

  async remove(id: string, userId: string): Promise<void> {
    const webhook = await this.repo.findOne({ where: { id, userId } });
    if (!webhook) throw new NotFoundException('Webhook not found');
    webhook.isActive = false;
    await this.repo.save(webhook);
  }

  async test(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; status?: number }> {
    const webhook = await this.repo.findOne({ where: { id, userId } });
    if (!webhook) throw new NotFoundException('Webhook not found');
    try {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test',
          timestamp: new Date().toISOString(),
        }),
      });
      webhook.lastTriggeredAt = new Date();
      await this.repo.save(webhook);
      return { success: res.ok, status: res.status };
    } catch {
      return { success: false };
    }
  }
}
