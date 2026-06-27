import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateContractDto {
  @IsString()
  title: string;

  @IsString()
  vendor: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}
