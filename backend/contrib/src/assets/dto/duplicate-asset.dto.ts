import { IsOptional, IsString } from 'class-validator';

export class DuplicateAssetDto {
  @IsOptional()
  @IsString()
  name?: string;
}