import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export const ASSET_SORT_COLUMNS = [
  'createdAt',
  'updatedAt',
  'name',
  'assetTag',
  'status',
  'purchaseDate',
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
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
