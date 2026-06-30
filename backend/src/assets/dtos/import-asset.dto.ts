import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { AssetStatus, AssetCondition } from '../entities/asset.entity';

export class ImportAssetDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsString()
  department: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(AssetCondition)
  @IsOptional()
  condition?: AssetCondition;

  @IsEnum(AssetStatus)
  @IsOptional()
  status?: AssetStatus;

  @IsNumber()
  @IsOptional()
  purchasePrice?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}