import { IsOptional, IsString } from 'class-validator';

export class SearchAssetsDto {
  @IsOptional()
  @IsString()
  q?: string;
}
