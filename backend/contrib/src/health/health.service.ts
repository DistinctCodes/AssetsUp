import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(private dataSource: DataSource) {}

  async check() {
    const timestamp = new Date();
    const uptime = process.uptime();
    let database = 'disconnected';
    try {
      await this.dataSource.query('SELECT 1');
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