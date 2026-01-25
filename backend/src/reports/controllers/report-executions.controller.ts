import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
  Res,
  StreamableFile,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReportExecution } from '../entities/report-execution.entity';
import { FileStorageService } from '../services/file-storage.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Report Executions')
@ApiBearerAuth()
@Controller('api/v1/report-executions')
@UseGuards(JwtAuthGuard)
export class ReportExecutionsController {
  constructor(
    @InjectRepository(ReportExecution)
    private executionRepository: Repository<ReportExecution>,
    private fileStorageService: FileStorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List executions' })
  async findAll(@Request() req) {
    return this.executionRepository.find({
      where: { executedBy: { id: req.user.id } },
      relations: ['report', 'executedBy'],
      order: { startedAt: 'DESC' },
      take: 50,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get execution details' })
  async findOne(@Param('id') id: string, @Request() req) {
    const execution = await this.executionRepository.findOne({
      where: { id },
      relations: ['report', 'executedBy'],
    });

    if (!execution) {
      throw new NotFoundException(`Execution with ID ${id} not found`);
    }

    if (execution.executedBy.id !== req.user.id) {
      throw new NotFoundException('Access denied');
    }

    return execution;
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download generated file' })
  async download(
    @Param('id') id: string,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const execution = await this.findOne(id, req);

    if (!execution.fileUrl || execution.status !== 'COMPLETED') {
      throw new NotFoundException('Report file not available');
    }

    // Extract filename from URL
    const filename = execution.fileUrl.split('/').pop();
    const buffer = await this.fileStorageService.getFile(filename);

    // Set appropriate headers
    const mimeTypes = {
      PDF: 'application/pdf',
      EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      CSV: 'text/csv',
      JSON: 'application/json',
    };

    const extensions = {
      PDF: 'pdf',
      EXCEL: 'xlsx',
      CSV: 'csv',
      JSON: 'json',
    };

    res.set({
      'Content-Type': mimeTypes[execution.format],
      'Content-Disposition': `attachment; filename="${execution.report.name}.${extensions[execution.format]}"`,
    });

    return new StreamableFile(buffer);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel running execution' })
  async cancel(@Param('id') id: string, @Request() req) {
    const execution = await this.findOne(id, req);

    if (execution.status === 'RUNNING') {
      execution.status = 'FAILED';
      execution.error = 'Cancelled by user';
      execution.completedAt = new Date();
      await this.executionRepository.save(execution);
    }
  }
}