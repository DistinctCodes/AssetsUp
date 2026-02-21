import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  IsArray,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssetStatus, AssetCondition } from '../enums';

export class CreateAssetDto {
  @ApiProperty({ example: 'MacBook Pro 16"' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 'uuid-of-category' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'uuid-of-department' })
  @IsUUID()
  departmentId: string;

  @ApiPropertyOptional({ example: 'SN-12345' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @ApiPropertyOptional({ example: 2500 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  purchasePrice?: number;

  @ApiPropertyOptional({ example: 2000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  currentValue?: number;

  @ApiPropertyOptional({ example: '2026-01-15' })
  @IsDateString()
  @IsOptional()
  warrantyExpiration?: string;

  @ApiPropertyOptional({ enum: AssetStatus, default: AssetStatus.ACTIVE })
  @IsEnum(AssetStatus)
  @IsOptional()
  status?: AssetStatus;

  @ApiPropertyOptional({ enum: AssetCondition, default: AssetCondition.NEW })
  @IsEnum(AssetCondition)
  @IsOptional()
  condition?: AssetCondition;

  @ApiPropertyOptional({ example: 'Floor 2, Room 204' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ example: 'uuid-of-user' })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({ example: 'Apple' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  manufacturer?: string;

  @ApiPropertyOptional({ example: 'MacBook Pro' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ example: ['laptop', 'engineering'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
