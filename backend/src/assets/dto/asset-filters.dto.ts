import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsNumber, Min, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AssetStatus, AssetCondition } from '../enums';

export class AssetFiltersDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: AssetStatus })
  @IsEnum(AssetStatus)
  @IsOptional()
  status?: AssetStatus;

  @ApiPropertyOptional({ enum: AssetCondition })
  @IsEnum(AssetCondition)
  @IsOptional()
  condition?: AssetCondition;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ default: false, description: 'Include soft-deleted assets (ADMIN only)' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDeleted?: boolean = false;
}
