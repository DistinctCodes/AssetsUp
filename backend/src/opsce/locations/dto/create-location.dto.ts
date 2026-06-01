import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationType } from '../entities/location.entity';

export class CreateLocationDto {
  @ApiProperty({
    description: 'Location name',
    example: 'Building A',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Location type',
    enum: LocationType,
    example: LocationType.BUILDING,
  })
  @IsEnum(LocationType)
  type: LocationType;

  @ApiPropertyOptional({
    description: 'Location address',
    example: '123 Main Street, New York, NY 10001',
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
