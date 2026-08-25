import { IsInt, IsMin, IsOptional, IsString } from 'class-validator';

export class CreatePurchaseOrderDto {
  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsInt()
  @IsMin(0)
  totalAmount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  poNumber?: string;
}