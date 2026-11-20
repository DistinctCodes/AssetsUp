import { IsEnum } from 'class-validator';
import { MaintenanceStatus } from '../entities/maintenance-record.entity';

export class UpdateMaintenanceStatusDto {
  @IsEnum(MaintenanceStatus)
  status: MaintenanceStatus;
}
