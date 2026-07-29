import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { CreateMaintenanceRecordDto } from './create-maintenance-record.dto';
import { MaintenanceStatus } from '../entities/maintenance-record.entity';

export class UpdateMaintenanceRecordDto extends PartialType(
  OmitType(CreateMaintenanceRecordDto, ['assetId'] as const),
) {
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @IsOptional()
  @IsDateString()
  completedDate?: string;
}
