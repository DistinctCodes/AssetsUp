import { IsString, IsOptional } from 'class-validator';

export class CheckinDto {
  @IsString()
  assetId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
