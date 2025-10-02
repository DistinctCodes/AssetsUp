import { PartialType } from '@nestjs/mapped-types';
import { CreateVendorContractDto } from './create-vendor-contract.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateVendorContractDto extends PartialType(
  CreateVendorContractDto,
) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
