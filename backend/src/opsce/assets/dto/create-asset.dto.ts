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
