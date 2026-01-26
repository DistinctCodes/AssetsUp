import { IsString, IsOptional, IsEnum, IsBoolean, IsObject, IsArray } from 'class-validator';
import { ReportType } from '../entities/report.entity';

export class CreateReportDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ReportType)
  type: ReportType;

  @IsOptional()
  @IsString()
  template?: string;

  @IsObject()
  configuration: {
    fields: string[];
    filters?: Record<string, any>;
    groupBy?: string;
    aggregations?: Array<{
      field: string;
      operation: 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX';
      alias: string;
    }>;
    sorting?: Array<{
      field: string;
      order: 'ASC' | 'DESC';
    }>;
    limit?: number;
  };

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

// src/reports/dto/update-report.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateReportDto } from './create-report.dto';

export class UpdateReportDto extends PartialType(CreateReportDto) {}

// src/reports/dto/execute-report.dto.ts
import { IsEnum, IsOptional, IsObject } from 'class-validator';
import { ReportFormat } from '../entities/scheduled-report.entity';

export class ExecuteReportDto {
  @IsEnum(ReportFormat)
  format: ReportFormat;

  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}

// src/reports/dto/share-report.dto.ts
import { IsArray, IsString } from 'class-validator';

export class ShareReportDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}

// src/reports/dto/create-scheduled-report.dto.ts
import { IsString, IsEnum, IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { ReportFormat, DeliveryMethod } from '../entities/scheduled-report.entity';

export class CreateScheduledReportDto {
  @IsUUID()
  reportId: string;

  @IsString()
  schedule: string; // cron expression

  @IsEnum(ReportFormat)
  format: ReportFormat;

  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsEnum(DeliveryMethod)
  deliveryMethod: DeliveryMethod;

  @IsOptional()
  @IsString()
  webhookUrl?: string;
}

// src/reports/dto/update-scheduled-report.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduledReportDto } from './create-scheduled-report.dto';

export class UpdateScheduledReportDto extends PartialType(CreateScheduledReportDto) {}