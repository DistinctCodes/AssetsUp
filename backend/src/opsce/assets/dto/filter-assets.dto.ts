import { IsEnum, IsIn, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { AssetCondition, AssetStatus } from '../entities/asset.entity';

export const ASSET_SORT_FIELDS = [
  'name',
  'status',
  'condition',
  'category',
  'departmentId',
  'locationId',
  'assignedToUserId',
  'createdAt',
  'updatedAt',
] as const;

export type AssetSortField = (typeof ASSET_SORT_FIELDS)[number];

export class FilterAssetsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @IsOptional()
  @IsIn(ASSET_SORT_FIELDS)
  sortBy?: AssetSortField;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
