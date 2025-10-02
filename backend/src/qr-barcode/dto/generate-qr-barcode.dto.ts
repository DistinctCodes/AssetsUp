import { IsIn, IsOptional } from 'class-validator';

export class GenerateCodeDto {
  // what to generate: 'qr', 'barcode' or 'both'
  @IsOptional()
  @IsIn(['qr', 'barcode', 'both'])
  type?: 'qr' | 'barcode' | 'both' = 'both';

  // whether to persist base64 into DB (default true)
  @IsOptional()
  persist?: boolean = true;

  // whether to save PNG files to disk
  @IsOptional()
  saveToDisk?: boolean = false;
}
