// src/reports/controllers/scheduled-reports.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ScheduledReportsService } from '../services/scheduled-reports.service';
import {
  CreateScheduledReportDto,
  UpdateScheduledReportDto,
} from '../dto/create-report.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Scheduled Reports')
@ApiBearerAuth()
@Controller('api/v1/scheduled-reports')
@UseGuards(JwtAuthGuard)
export class ScheduledReportsController {
  constructor(
    private readonly scheduledReportsService: ScheduledReportsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Schedule report' })
  async create(
    @Body() createScheduledReportDto: CreateScheduledReportDto,
    @Request() req,
  ) {
    return this.scheduledReportsService.create(createScheduledReportDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'List scheduled reports' })
  async findAll(@Request() req) {
    return this.scheduledReportsService.findAll(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get scheduled report details' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.scheduledReportsService.findOne(id, req.user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update schedule' })
  async update(
    @Param('id') id: string,
    @Body() updateScheduledReportDto: UpdateScheduledReportDto,
    @Request() req,
  ) {
    return this.scheduledReportsService.update(
      id,
      updateScheduledReportDto,
      req.user,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove schedule' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.scheduledReportsService.remove(id, req.user);
  }

  @Post(':id/run-now')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Execute immediately' })
  async runNow(@Param('id') id: string, @Request() req) {
    await this.scheduledReportsService.runNow(id, req.user);
    return { message: 'Report execution started' };
  }
}