import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AssetCondition,
  AssetStatus,
  DepreciationMethod,
  InsuranceInfo,
  MaintenanceSchedule,
  WarrantyInfo,
} from '../entities/asset.entity';

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetStatus, AssetCondition } from '../entities/asset.entity';

export class CreateAssetDto {
  @ApiProperty({ description: 'Asset name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Asset description' })
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  assetTag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  modelYear?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subCategory?: string;

  @ApiProperty({ description: 'Asset category' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ description: 'Serial number' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Asset status', enum: AssetStatus })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({ description: 'Asset condition', enum: AssetCondition })
  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  purchaseValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  residualValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usefulLifeYears?: number;

  @IsOptional()
  @IsEnum(DepreciationMethod)
  depreciationMethod?: DepreciationMethod;

  @IsOptional()
  @IsObject()
  depreciationConfig?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  vendor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  purchaseOrderNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoiceNumber?: string;

  @IsOptional()
  @IsObject()
  warrantyInfo?: WarrantyInfo;

  @IsOptional()
  @IsObject()
  insuranceInfo?: InsuranceInfo;

  @IsOptional()
  @IsDateString()
  nextMaintenanceDue?: string;

  @IsOptional()
  @IsDateString()
  lastMaintenanceDate?: string;

  @IsOptional()
  @IsObject()
  maintenanceSchedule?: MaintenanceSchedule;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUrl({}, { each: true })
  additionalPhotoUrls?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUrl({}, { each: true })
  documentUrls?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
  @ApiPropertyOptional({ description: 'Purchase date' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: Date;

  @ApiPropertyOptional({ description: 'Purchase value' })
  @IsOptional()
  @IsNumber()
  purchaseValue?: number;

  @ApiPropertyOptional({ description: 'Current value' })
  @IsOptional()
  @IsNumber()
  currentValue?: number;

  @ApiPropertyOptional({ description: 'User ID assigned to' })
  @IsOptional()
  @IsString()
  assignedToUserId?: string;

  @ApiPropertyOptional({ description: 'Department ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Location ID' })
  @IsOptional()
  @IsString()
  locationId?: string;
}
