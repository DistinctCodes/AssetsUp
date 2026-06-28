import { IsString, IsOptional } from 'class-validator';

export class CreateMaintenanceDto {
  @IsString()
  type: string;

  @IsString()
  description: string;

  @IsString()
  scheduledDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
