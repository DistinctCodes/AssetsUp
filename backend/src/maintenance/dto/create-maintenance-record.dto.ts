import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { MaintenanceType } from '../entities/maintenance-record.entity';

export class CreateMaintenanceRecordDto {
  @IsOptional()
  @IsString()
  assetId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(MaintenanceType)
  type?: MaintenanceType;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsInt()
  cost?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsDateString()
  scheduledDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
