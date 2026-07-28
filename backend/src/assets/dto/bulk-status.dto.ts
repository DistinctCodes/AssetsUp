import { ArrayMaxSize, IsArray, IsEnum, IsString } from 'class-validator';
import { AssetStatus } from '../asset-lifecycle.service';

export class BulkStatusDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(200, { message: 'Maximum 200 IDs per request' })
  ids: string[];

  @IsEnum(AssetStatus)
  status: AssetStatus;
}
