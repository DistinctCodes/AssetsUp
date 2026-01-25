// src/reports/services/reports.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Report, ReportType } from '../entities/report.entity';
import { ReportExecution, ExecutionStatus } from '../entities/report-execution.entity';
import { User } from '../../users/entities/user.entity';
import { CreateReportDto } from '../dto/create-report.dto';
import { UpdateReportDto } from '../dto/update-report.dto';
import { ReportGeneratorService } from './report-generator.service';
import { FileStorageService } from './file-storage.service';
import { ReportFormat } from '../entities/scheduled-report.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    @InjectRepository(ReportExecution)
    private executionRepository: Repository<ReportExecution>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private reportGeneratorService: ReportGeneratorService,
    private fileStorageService: FileStorageService,
  ) {}

  async create(createReportDto: CreateReportDto, user: User): Promise<Report> {
    const report = this.reportRepository.create({
      ...createReportDto,
      createdBy: user,
    });

    return this.reportRepository.save(report);
  }

  async findAll(user: User): Promise<Report[]> {
    return this.reportRepository.find({
      where: [
        { createdBy: { id: user.id } },
        { isPublic: true },
        { sharedWith: { id: user.id } },
      ],
      relations: ['createdBy', 'sharedWith'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<Report> {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: ['createdBy', 'sharedWith'],
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    // Check access permissions
    this.checkAccess(report, user);

    return report;
  }

  async update(
    id: string,
    updateReportDto: UpdateReportDto,
    user: User,
  ): Promise<Report> {
    const report = await this.findOne(id, user);

    if (report.createdBy.id !== user.id) {
      throw new ForbiddenException('Only the creator can update this report');
    }

    Object.assign(report, updateReportDto);
    return this.reportRepository.save(report);
  }

  async remove(id: string, user: User): Promise<void> {
    const report = await this.findOne(id, user);

    if (report.createdBy.id !== user.id) {
      throw new ForbiddenException('Only the creator can delete this report');
    }

    await this.reportRepository.remove(report);
  }

  async execute(
    id: string,
    format: ReportFormat,
    parameters: Record<string, any>,
    user: User,
  ): Promise<ReportExecution> {
    const report = await this.findOne(id, user);

    // Create execution record
    const execution = this.executionRepository.create({
      report,
      executedBy: user,
      status: ExecutionStatus.RUNNING,
      parameters,
      format,
      startedAt: new Date(),
    });

    const savedExecution = await this.executionRepository.save(execution);

    // Execute report asynchronously
    this.executeReportAsync(savedExecution, report, format, parameters);

    return savedExecution;
  }

  private async executeReportAsync(
    execution: ReportExecution,
    report: Report,
    format: ReportFormat,
    parameters: Record<string, any>,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Generate report
      const { data, buffer, mimeType } =
        await this.reportGeneratorService.executeReport(
          report,
          format,
          parameters,
        );

      // Save file
      const filename = this.fileStorageService.generateFilename(
        report.name,
        format,
        execution.id,
      );
      const { url, size } = await this.fileStorageService.saveFile(
        buffer,
        filename,
        mimeType,
      );

      // Update execution
      const executionTime = Date.now() - startTime;
      execution.status = ExecutionStatus.COMPLETED;
      execution.resultCount = data.length;
      execution.executionTime = executionTime;
      execution.fileUrl = url;
      execution.fileSize = size;
      execution.completedAt = new Date();

      await this.executionRepository.save(execution);

      // Update report statistics
      report.executionCount += 1;
      report.lastExecutedAt = new Date();
      report.averageExecutionTime =
        (report.averageExecutionTime * (report.executionCount - 1) +
          executionTime) /
        report.executionCount;

      await this.reportRepository.save(report);
    } catch (error) {
      execution.status = ExecutionStatus.FAILED;
      execution.error = error.message;
      execution.completedAt = new Date();
      await this.executionRepository.save(execution);
    }
  }

  async preview(id: string, user: User): Promise<any[]> {
    const report = await this.findOne(id, user);

    // Execute with limit of 100
    const previewConfig = {
      ...report.configuration,
      limit: 100,
    };

    const tempReport = { ...report, configuration: previewConfig };
    const { data } = await this.reportGeneratorService.executeReport(
      tempReport as Report,
      ReportFormat.JSON,
    );

    return data;
  }

  async share(id: string, userIds: string[], user: User): Promise<Report> {
    const report = await this.findOne(id, user);

    if (report.createdBy.id !== user.id) {
      throw new ForbiddenException('Only the creator can share this report');
    }

    const usersToShare = await this.userRepository.findBy({
      id: In(userIds),
    });

    if (usersToShare.length !== userIds.length) {
      throw new BadRequestException('Some users not found');
    }

    report.sharedWith = [...(report.sharedWith || []), ...usersToShare];
    return this.reportRepository.save(report);
  }

  async getTemplates(): Promise<
    Array<{ id: string; name: string; description: string }>
  > {
    return [
      {
        id: 'ASSET_INVENTORY',
        name: 'Asset Inventory Report',
        description: 'All assets with full details',
      },
      {
        id: 'ASSET_VALUE',
        name: 'Asset Value Report',
        description: 'Total value by department/category/location',
      },
      {
        id: 'DEPRECIATION',
        name: 'Depreciation Report',
        description: 'Asset depreciation over time',
      },
      {
        id: 'ASSET_UTILIZATION',
        name: 'Asset Utilization Report',
        description: 'Assigned vs unassigned assets',
      },
      {
        id: 'WARRANTY_EXPIRATION',
        name: 'Warranty Expiration Report',
        description: 'Assets with warranties expiring soon',
      },
      {
        id: 'MAINTENANCE_SCHEDULE',
        name: 'Maintenance Schedule Report',
        description: 'Upcoming maintenance',
      },
      {
        id: 'TRANSFER_HISTORY',
        name: 'Transfer History Report',
        description: 'All transfers in date range',
      },
      {
        id: 'DEPARTMENT_SUMMARY',
        name: 'Department Asset Summary',
        description: 'Assets per department with totals',
      },
      {
        id: 'AUDIT_TRAIL',
        name: 'Audit Trail Report',
        description: 'All changes by user/date',
      },
      {
        id: 'ASSET_LIFECYCLE',
        name: 'Asset Lifecycle Report',
        description: 'Assets by status over time',
      },
    ];
  }

  private checkAccess(report: Report, user: User): void {
    const isCreator = report.createdBy.id === user.id;
    const isPublic = report.isPublic;
    const isShared = report.sharedWith?.some((u) => u.id === user.id);

    if (!isCreator && !isPublic && !isShared) {
      throw new ForbiddenException('You do not have access to this report');
    }
  }
}