import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
