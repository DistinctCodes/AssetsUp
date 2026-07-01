import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  getSummary() {
    return this.reportsService.getSummary();
  }

  @Get('warranty-expiring')
  getWarrantyExpiring(@Query('days') days?: string) {
    return this.reportsService.getWarrantyExpiring(
      days ? parseInt(days, 10) : 30,
    );
  }

  @Get('maintenance-costs')
  getMaintenanceCosts() {
    return this.reportsService.getMaintenanceCosts();
  }

  @Get('depreciation')
  getDepreciation() {
    return this.reportsService.getDepreciation();
  }

  @Get('asset-utilisation')
  getAssetUtilisation() {
    return this.reportsService.getAssetUtilisation();
  }

  @Get('schedules')
  getSchedules(@Req() req: any) {
    return this.reportsService.getSchedules(req.user?.id);
  }

  @Post('schedules')
  createSchedule(
    @Req() req: any,
    @Body() body: { reportType: string; frequency: string; email: string },
  ) {
    return this.reportsService.createSchedule(
      req.user?.id,
      body.reportType,
      body.frequency,
      body.email,
    );
  }

  @Delete('schedules/:id')
  deleteSchedule(@Param('id') id: string, @Req() req: any) {
    return this.reportsService.deleteSchedule(id, req.user?.id);
  }
}
