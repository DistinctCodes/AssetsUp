// src/reports/reports.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { ScheduledReport } from './entities/scheduled-report.entity';
import { ReportExecution } from './entities/report-execution.entity';
import { Asset } from '../assets/entities/asset.entity';
import { User } from '../users/entities/user.entity';

// Controllers
import { ReportsController } from './controllers/reports.controller';
import { ReportExecutionsController } from './controllers/report-executions.controller';
import { ScheduledReportsController } from './controllers/scheduled-reports.controller';

// Services
import { ReportsService } from './services/reports.service';
import { ScheduledReportsService } from './services/scheduled-reports.service';
import { ReportGeneratorService } from './services/report-generator.service';
import { FileStorageService } from './services/file-storage.service';
import { EmailService } from './services/email.service';
import { CsvExportService } from './services/csv-export.service';
import { JsonExportService } from './services/json-export.service';
import { ExcelExportService } from './services/excel-export.service';
import { PdfExportService } from './services/pdf-export.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Report,
      ScheduledReport,
      ReportExecution,
      Asset,
      User,
    ]),
  ],
  controllers: [
    ReportsController,
    ReportExecutionsController,
    ScheduledReportsController,
  ],
  providers: [
    ReportsService,
    ScheduledReportsService,
    ReportGeneratorService,
    FileStorageService,
    EmailService,
    CsvExportService,
    JsonExportService,
    ExcelExportService,
    PdfExportService,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}