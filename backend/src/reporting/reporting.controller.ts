import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportingService } from './reporting.service';

@Controller('reports')
@UseGuards(AuthGuard('jwt'))
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('asset-summary')
  async getAssetSummary() {
    return this.reportingService.getAssetSummary();
  }

  @Get('by-department')
  async getDepartmentReport() {
    return this.reportingService.getDepartmentReport();
  }

  @Get('by-category')
  async getCategoryReport() {
    return this.reportingService.getCategoryReport();
  }

  @Get('value-over-time')
  async getValueOverTime() {
    return this.reportingService.getValueOverTime();
  }
}
