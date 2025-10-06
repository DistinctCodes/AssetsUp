/* eslint-disable prettier/prettier */
import { IsOptional, IsString } from 'class-validator';

export class UpdateScheduleSettingsDto {
  @IsOptional() @IsString() licenseCheckCron?: string;
  @IsOptional() @IsString() insuranceReminderCron?: string;
  @IsOptional() @IsString() maintenanceCheckCron?: string;
}
