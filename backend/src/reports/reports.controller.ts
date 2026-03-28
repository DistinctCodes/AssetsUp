import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(CombinedAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get asset summary statistics' })
  getSummary() {
    return this.service.getSummary();
  }

  @Get('by-department')
  @ApiOperation({ summary: 'Get asset breakdown by department' })
  getByDepartment() {
    return this.service.getByDepartment();
  }

  @Get('by-category')
  @ApiOperation({ summary: 'Get asset breakdown by category' })
  getByCategory() {
    return this.service.getByCategory();
  }

  @Get('maintenance-history')
  @ApiOperation({ summary: 'Get maintenance history within a date range' })
  getMaintenanceHistory(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getMaintenanceHistory(from, to);
  }
}
