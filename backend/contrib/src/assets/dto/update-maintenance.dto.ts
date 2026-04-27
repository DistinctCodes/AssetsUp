import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { MaintenanceStatus } from '../enums';

export class UpdateMaintenanceDto {
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @IsOptional()
  completedDate?: string;

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
