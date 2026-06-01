


export class healthController {
    constructor(private readonly healthService: HealthService) {}

    @Get()
    getHealth(): string {
        return this.healthService.getHealthStatus();
    }
}


import {
  Controller,
  Get,
} from '@nestjs/common';

import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';

import { RedisHealthIndicator } from './indicators/redis.health';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('postgres'),

      () =>
        this.redis.isHealthy('redis'),

      () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }
}