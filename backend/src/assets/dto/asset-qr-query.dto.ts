import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class AssetQrQueryDto {
  @ApiPropertyOptional({ enum: ['png', 'svg'], default: 'png' })
  @IsOptional()
  @IsIn(['png', 'svg'])
  format?: 'png' | 'svg' = 'png';

  @ApiPropertyOptional({ description: 'Width/height in px', default: 256 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(64)
  @Max(1024)
  size?: number = 256;
}

export class AssetLabelQueryDto {
  @ApiPropertyOptional({ description: 'Bar width scale', default: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  scale?: number = 3;
}
