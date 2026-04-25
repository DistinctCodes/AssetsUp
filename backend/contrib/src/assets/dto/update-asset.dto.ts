import { IsOptional, IsString, IsNumber, IsDateString, IsEnum } from 'class-validator';

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED'])
  status?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;
}
