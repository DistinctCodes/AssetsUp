import { IsString, IsOptional, IsNumber, IsInt } from 'class-validator';

export class CreateLicenseDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  softwareName?: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsInt()
  totalSeats?: number;

  @IsOptional()
  @IsInt()
  usedSeats?: number;

  @IsOptional()
  @IsString()
  purchaseDate?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}
