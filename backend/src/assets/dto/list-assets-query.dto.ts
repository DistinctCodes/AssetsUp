import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { AssetStatusInput } from '../asset-lifecycle.service';

export const ASSET_STATUS_INPUTS = Object.values(AssetStatusInput);

export const ASSET_SORT_COLUMNS = [
  'createdAt',
  'updatedAt',
  'name',
  'assetTag',
  'status',
  'purchaseDate',
  'purchaseCost',
  'warrantyExpiry',
] as const;

export class ListAssetsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ASSET_SORT_COLUMNS, default: 'createdAt' })
  @IsOptional()
  @IsIn(ASSET_SORT_COLUMNS)
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locationId?: string;
  @ApiPropertyOptional({
    description:
      'Status to filter by. Canonical values and the legacy ACTIVE / MAINTENANCE aliases are accepted.',
    enum: ASSET_STATUS_INPUTS,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsIn(ASSET_STATUS_INPUTS)
  status?: AssetStatusInput;
  @ApiPropertyOptional({
    description: 'Only assets assigned to this user id; `me` means the caller',
  })
  @IsOptional()
  @IsString()
  assignedToId?: string;
}
