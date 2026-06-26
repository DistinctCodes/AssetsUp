import { IsArray, IsString } from 'class-validator';

export class BulkStatusDto {
  @IsArray()
  ids: string[];

  @IsString()
  status: string;
}
