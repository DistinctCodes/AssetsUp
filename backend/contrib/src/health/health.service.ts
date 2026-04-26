import { Injectable } from '@nestjs/common';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

@Injectable()
export class HealthService {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  async check() {
    const timestamp = new Date();
    const uptime = process.uptime();
    let database = 'disconnected';
    try {
      await this.db.pingCheck('database');
      database = 'connected';
    } catch (error) {
      // remain disconnected
    }
    return {
      status: 'ok',
      timestamp,
      uptime,
      database,
    };
  }
}