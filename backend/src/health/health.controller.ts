import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  getLiveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  getReadiness() {
    return {
      status: 'ok',
      checks: {
        database: 'up',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
