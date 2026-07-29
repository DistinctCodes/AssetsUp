import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsDateString,
} from 'class-validator';
import { LicenseType, BillingPeriod } from '../entities/license.entity';

export class CreateLicenseDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsString()
  licenseKey: string;

  @IsOptional()
  @IsEnum(LicenseType)
  type?: LicenseType;

  @IsOptional()
  @IsEnum(BillingPeriod)
  billingPeriod?: BillingPeriod;

  @IsInt()
  @IsPositive()
  seatsTotal: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsInt()
  cost?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  autoRenew?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
