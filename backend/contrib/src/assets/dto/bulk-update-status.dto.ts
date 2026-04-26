import { IsArray, IsEnum, IsUUID, ArrayNotEmpty } from 'class-validator';
import { AssetStatus } from '../enums';

export class BulkUpdateStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids: string[];

  @IsEnum(AssetStatus)
  status: AssetStatus;
}
