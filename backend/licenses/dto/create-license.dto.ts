import { IsString, IsNotEmpty, IsDateString, IsUrl } from 'class-validator';

export class CreateLicenseDto {
  @IsString()
  @IsNotEmpty()
  assetId: string;

  @IsString()
  @IsNotEmpty()
  licenseType: string;

  @IsDateString()
  expiryDate: string;

  @IsUrl()
  documentUrl: string;
}