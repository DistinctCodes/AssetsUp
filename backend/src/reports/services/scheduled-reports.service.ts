// src/reports/services/scheduled-reports.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ScheduledReport } from '../entities/scheduled-report.entity';
import { Report } from '../entities/report.entity';
import { User } from '../../users/entities/user.entity';
import { CreateScheduledReportDto } from '../dto/create-report.dto';
import { UpdateScheduledReportDto } from '../dto/create-report.dto';
import { ReportsService } from './reports.service';
import { EmailService } from './email.service';

@Injectable()
export class ScheduledReportsService {
  private readonly logger = new Logger(ScheduledReportsService.name);

  constructor(
    @InjectRepository(ScheduledReport)
    private scheduledReportRepository: Repository<ScheduledReport>,
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    private reportsService: ReportsService,
    private emailService: EmailService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    // Load all active scheduled reports and register them
    const activeSchedules = await this.scheduledReportRepository.find({
      where: { isActive: true },
      relations: ['report', 'createdBy'],
    });

    for (const schedule of activeSchedules) {
      this.registerCronJob(schedule);
    }

    this.logger.log(`Registered ${activeSchedules.length} scheduled reports`);
  }

  async create(
    createScheduledReportDto: CreateScheduledReportDto,
    user: User,
  ): Promise<ScheduledReport> {
    const report = await this.reportRepository.findOne({
      where: { id: createScheduledReportDto.reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const scheduledReport = this.scheduledReportRepository.create({
      ...createScheduledReportDto,
      report,
      createdBy: user,
      nextRunAt: this.calculateNextRun(createScheduledReportDto.schedule),
    });

    const saved = await this.scheduledReportRepository.save(scheduledReport);

    if (saved.isActive) {
      this.registerCronJob(saved);
    }

    return saved;
  }

  async findAll(user: User): Promise<ScheduledReport[]> {
    return this.scheduledReportRepository.find({
      where: { createdBy: { id: user.id } },
      relations: ['report', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<ScheduledReport> {
    const scheduledReport = await this.scheduledReportRepository.findOne({
      where: { id },
      relations: ['report', 'createdBy'],
    });

    if (!scheduledReport) {
      throw new NotFoundException(`Scheduled report with ID ${id} not found`);
    }

    if (scheduledReport.createdBy.id !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return scheduledReport;
  }

  async update(
    id: string,
    updateScheduledReportDto: UpdateScheduledReportDto,
    user: User,
  ): Promise<ScheduledReport> {
    const scheduledReport = await this.findOne(id, user);

    // Unregister old cron job
    this.unregisterCronJob(id);

    Object.assign(scheduledReport, updateScheduledReportDto);

    if (updateScheduledReportDto.schedule) {
      scheduledReport.nextRunAt = this.calculateNextRun(
        updateScheduledReportDto.schedule,
      );
    }

    const updated = await this.scheduledReportRepository.save(scheduledReport);

    // Register new cron job if active
    if (updated.isActive) {
      this.registerCronJob(updated);
    }

    return updated;
  }

  async remove(id: string, user: User): Promise<void> {
    const scheduledReport = await this.findOne(id, user);
    this.unregisterCronJob(id);
    await this.scheduledReportRepository.remove(scheduledReport);
  }

  async runNow(id: string, user: User): Promise<void> {
    const scheduledReport = await this.findOne(id, user);
    await this.executeScheduledReport(scheduledReport);
  }

  private registerCronJob(scheduledReport: ScheduledReport): void {
    try {
      const job = new CronJob(scheduledReport.schedule, async () => {
        await this.executeScheduledReport(scheduledReport);
      });

      this.schedulerRegistry.addCronJob(scheduledReport.id, job);
      job.start();

      this.logger.log(
        `Registered cron job for scheduled report: ${scheduledReport.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to register cron job for ${scheduledReport.id}: ${error.message}`,
      );
    }
  }

  private unregisterCronJob(id: string): void {
    try {
      if (this.schedulerRegistry.doesExist('cron', id)) {
        this.schedulerRegistry.deleteCronJob(id);
        this.logger.log(`Unregistered cron job: ${id}`);
      }
    } catch (error) {
      this.logger.error(`Failed to unregister cron job ${id}: ${error.message}`);
    }
  }

  private async executeScheduledReport(
    scheduledReport: ScheduledReport,
  ): Promise<void> {
    try {
      this.logger.log(
        `Executing scheduled report: ${scheduledReport.report.name}`,
      );

      // Execute the report
      const execution = await this.reportsService.execute(
        scheduledReport.report.id,
        scheduledReport.format,
        {},
        scheduledReport.createdBy,
      );

      // Wait for execution to complete
      await this.waitForExecution(execution.id);

      // Deliver the report
      await this.deliverReport(scheduledReport, execution.id);

      // Update last run time
      scheduledReport.lastRunAt = new Date();
      scheduledReport.nextRunAt = this.calculateNextRun(
        scheduledReport.schedule,
      );
      await this.scheduledReportRepository.save(scheduledReport);

      this.logger.log(
        `Successfully executed scheduled report: ${scheduledReport.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to execute scheduled report ${scheduledReport.id}: ${error.message}`,
      );
    }
  }

  private async waitForExecution(executionId: string): Promise<void> {
    // Poll execution status until completed or failed
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

      const execution = await this.reportsService['executionRepository'].findOne(
        {
          where: { id: executionId },
        },
      );

      if (
        execution.status === 'COMPLETED' ||
        execution.status === 'FAILED'
      ) {
        return;
      }

      attempts++;
    }

    throw new Error('Report execution timeout');
  }

  private async deliverReport(
    scheduledReport: ScheduledReport,
    executionId: string,
  ): Promise<void> {
    switch (scheduledReport.deliveryMethod) {
      case 'EMAIL':
        await this.emailService.sendReportEmail(
          scheduledReport.recipients,
          scheduledReport.report.name,
          executionId,
        );
        break;

      case 'WEBHOOK':
        // Implement webhook delivery
        this.logger.log('Webhook delivery not yet implemented');
        break;

      case 'FTP':
        // Implement FTP delivery
        this.logger.log('FTP delivery not yet implemented');
        break;
    }
  }

  private calculateNextRun(cronExpression: string): Date {
    try {
      const job = new CronJob(cronExpression, () => {});
      return job.nextDate().toJSDate();
    } catch (error) {
      this.logger.error(`Invalid cron expression: ${cronExpression}`);
      return new Date();
    }
  }

  // Cleanup expired cron jobs every day at midnight
  @Cron('0 0 * * *')
  async cleanupInactiveJobs() {
    const inactiveReports = await this.scheduledReportRepository.find({
      where: { isActive: false },
    });

    for (const report of inactiveReports) {
      this.unregisterCronJob(report.id);
    }

    this.logger.log(`Cleaned up ${inactiveReports.length} inactive cron jobs`);
  }
}