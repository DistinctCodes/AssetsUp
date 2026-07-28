import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

export class BulkDeleteDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(200, { message: 'Maximum 200 IDs per request' })
  ids: string[];
}
