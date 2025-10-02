import {
  IsUUID,
  IsString,
  IsDateString,
  IsOptional,
  IsUrl,
  Length,
} from 'class-validator';

export class CreateVendorContractDto {
  @IsUUID()
  supplierId: string;

  @IsString()
  @Length(1, 255)
  contractName: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsUrl()
  fileUrl?: string;
}
