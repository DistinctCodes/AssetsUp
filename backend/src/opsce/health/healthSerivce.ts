

@Injectable()
export class HealthService {
  getHealthStatus(): string {
    return 'OK';
  }
}


import {
  Injectable,
} from '@nestjs/common';

import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';

import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly redis: Redis;

  constructor() {
    super();

    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
    });
  }

  async isHealthy(
    key: string,
  ): Promise<HealthIndicatorResult> {
    try {
      const response = await this.redis.ping();

      const result = this.getStatus(
        key,
        response === 'PONG',
      );

      if (response !== 'PONG') {
        throw new HealthCheckError(
          'Redis check failed',
          result,
        );
      }

      return result;
    } catch (error) {
      throw new HealthCheckError(
        'Redis unavailable',
        this.getStatus(key, false),
      );
    }
  }
}