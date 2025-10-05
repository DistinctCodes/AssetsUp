/* eslint-disable prettier/prettier */
import { IsUUID, IsOptional, IsDateString } from 'class-validator';

export class CreateApiKeyDto {
  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

