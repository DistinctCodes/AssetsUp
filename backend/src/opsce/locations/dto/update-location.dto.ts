import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LocationType } from '../entities/location.entity';

export class UpdateLocationDto {
  @ApiPropertyOptional({
    description: 'Location name',
    example: 'Building B',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Location type',
    enum: LocationType,
    example: LocationType.FLOOR,
  })
  @IsOptional()
  @IsEnum(LocationType)
  type?: LocationType;

  @ApiPropertyOptional({
    description: 'Location address',
    example: '456 Oak Avenue, Boston, MA 02101',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Parent location ID (for hierarchical structure)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
