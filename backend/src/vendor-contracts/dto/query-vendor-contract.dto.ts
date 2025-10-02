import { IsOptional, IsUUID, IsNumberString } from 'class-validator';

export class QueryVendorContractDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  search?: string;

  // simple pagination
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
