import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get('REDIS_HOST', 'localhost');
    const port = this.configService.get('REDIS_PORT', 6379);
    const password = this.configService.get('REDIS_PASSWORD');
    
    let url = `redis://${host}:${port}`;
    if (password) {
      url = `redis://:${password}@${host}:${port}`;
    }

    this.client = createClient({ url });

    this.client.on('error', (err) => this.logger.error('Redis Client Error', err));

    await this.client.connect();
    this.logger.log('Connected to Redis');
  }

  async onModuleDestroy() {
    await this.client.disconnect();
  }

  async get(key: string): Promise<string | null> {
    const value = await this.client.get(key);
    return typeof value === 'string' ? value : null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, { EX: ttlSeconds });
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
