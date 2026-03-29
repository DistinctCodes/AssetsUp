import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class DuplicateAssetDto {
  @ApiPropertyOptional({ description: 'Override name for duplicated asset(s)' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Serial number for the duplicated asset (only used when quantity=1)' })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Number of copies to create (default 1, max 50)', default: 1 })
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  quantity?: number = 1;
}
