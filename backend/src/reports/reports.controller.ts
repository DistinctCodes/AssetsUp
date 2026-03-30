import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { AssetFiltersDto } from '../assets/dto/asset-filters.dto';
import { Response } from 'express';

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

  @Get('assets/export/excel')
  @ApiOperation({ summary: 'Export assets to Excel file' })
  async exportExcel(
    @Query() filters: AssetFiltersDto,
    @Res() res: Response,
  ) {
    const workbook = await this.service.exportToExcel(filters);
    
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="assets-export.xlsx"',
    );
    
    return workbook.pipe(res);
  }

  @Get('assets/export/pdf')
  @ApiOperation({ summary: 'Export assets to PDF file' })
  async exportPdf(
    @Query() filters: AssetFiltersDto,
    @Res() res: Response,
  ) {
    const pdfStream = await this.service.exportToPdf(filters);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="assets-report.pdf"',
    );
    
    return pdfStream.pipe(res);
  }
}
