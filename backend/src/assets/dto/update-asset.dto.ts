import { PartialType } from '@nestjs/mapped-types';
import { CreateAssetDto } from './create-asset.dto';
import { IsEnum, IsNotEmpty, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { AssetStatus } from '../entities/asset.entity';
import { Type } from 'class-transformer';

export class UpdateAssetDto extends PartialType(CreateAssetDto) {}

export class UpdateAssetStatusDto {
  @IsNotEmpty()
  @IsEnum(AssetStatus)
  status: AssetStatus;
}

export class BulkUpdateAssetDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  ids: string[];

  @ValidateNested()
  @Type(() => UpdateAssetDto)
  data: UpdateAssetDto;
}

export class BulkDeleteAssetDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  ids: string[];
}