import {
  Controller,
  Get,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get asset summary statistics' })
  @ApiResponse({ status: 200, description: 'Returns summary statistics' })
  async getSummary() {
    return this.reportsService.getSummary();
  }

  @Get('export/excel')
  async exportExcel(@Res() res: Response) {
    try {
      const buffer = await this.reportsService.generateExcelReport();
      
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=assets-report.xlsx',
      );
      
      res.send(buffer);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to generate Excel report',
        error: error.message,
      });
    }
  }

  @Get('export/pdf')
  async exportPdf(@Res() res: Response) {
    try {
      const buffer = await this.reportsService.generatePdfReport();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=assets-report.pdf',
      );
      
      res.send(buffer);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to generate PDF report',
        error: error.message,
      });
    }
  }
}
