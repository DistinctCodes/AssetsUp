// src/reports/controllers/reports.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReportsService } from '../services/reports.service';
import { CreateReportDto, UpdateReportDto, ExecuteReportDto, ShareReportDto } from '../dto/create-report.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('api/v1/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Create custom report' })
  async create(@Body() createReportDto: CreateReportDto, @Request() req) {
    return this.reportsService.create(createReportDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'List all reports (user\'s + public)' })
  async findAll(@Request() req) {
    return this.reportsService.findAll(req.user);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List predefined report templates' })
  async getTemplates() {
    return this.reportsService.getTemplates();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report configuration' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.reportsService.findOne(id, req.user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update report' })
  async update(
    @Param('id') id: string,
    @Body() updateReportDto: UpdateReportDto,
    @Request() req,
  ) {
    return this.reportsService.update(id, updateReportDto, req.user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete report' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.reportsService.remove(id, req.user);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute report' })
  async execute(
    @Param('id') id: string,
    @Body() executeReportDto: ExecuteReportDto,
    @Request() req,
  ) {
    return this.reportsService.execute(
      id,
      executeReportDto.format,
      executeReportDto.parameters || {},
      req.user,
    );
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Preview report (first 100 rows)' })
  async preview(@Param('id') id: string, @Request() req) {
    return this.reportsService.preview(id, req.user);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Share report with users' })
  async share(
    @Param('id') id: string,
    @Body() shareReportDto: ShareReportDto,
    @Request() req,
  ) {
    return this.reportsService.share(id, shareReportDto.userIds, req.user);
  }
}