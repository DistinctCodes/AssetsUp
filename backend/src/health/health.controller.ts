import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  getLiveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  @ApiResponse({ status: 200, description: 'All systems operational' })
  @ApiResponse({ status: 503, description: 'One or more systems degraded' })
  @HttpCode(HttpStatus.OK)
  async getReadiness() {
    const checks = {
      database: 'down' as 'up' | 'down',
    };

    try {
      await this.dataSource.query('SELECT 1');
      checks.database = 'up';
    } catch {
      checks.database = 'down';
    }

    const allUp = Object.values(checks).every((v) => v === 'up');

    return {
      status: allUp ? 'ok' : 'error',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
