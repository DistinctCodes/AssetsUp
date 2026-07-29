import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LocationType } from '../entities/location.entity';

export class CreateLocationDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsEnum(LocationType)
  type?: LocationType;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  parentLocationId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}
