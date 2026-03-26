import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LocationType } from '../location.entity';

export class CreateLocationDto {
  @ApiProperty({ example: 'Lagos HQ' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: LocationType })
  @IsEnum(LocationType)
  type: LocationType;

  @ApiProperty({ required: false, example: '1 Nelson Mandela St, Lagos' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, example: 'Main office for the company' })
  @IsOptional()
  @IsString()
  description?: string;
}
