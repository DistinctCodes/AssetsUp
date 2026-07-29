import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetStatusInput } from '../asset-lifecycle.service';

export class UpdateAssetStatusDto {
  @ApiProperty({ enum: AssetStatusInput, description: 'Target asset status' })
  @IsEnum(AssetStatusInput, {
    message: `status must be one of: ${Object.values(AssetStatusInput).join(', ')}`,
  })
  status: AssetStatusInput;

  @ApiPropertyOptional({ description: 'Why the status changed' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
