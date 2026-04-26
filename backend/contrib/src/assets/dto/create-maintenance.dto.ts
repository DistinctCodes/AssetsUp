import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { MaintenanceType } from '../enums';

export class CreateMaintenanceDto {
  @IsNotEmpty()
  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  scheduledDate: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  cost?: number;
}
