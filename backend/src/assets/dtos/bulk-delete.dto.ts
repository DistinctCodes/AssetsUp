import { IsArray } from 'class-validator';

export class BulkDeleteDto {
  @IsArray()
  ids: string[];
}
