import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  assetCreated?: boolean;

  @IsOptional()
  @IsBoolean()
  assetTransferred?: boolean;

  @IsOptional()
  @IsBoolean()
  maintenanceDue?: boolean;

  @IsOptional()
  @IsBoolean()
  warrantyExpiring?: boolean;
}
