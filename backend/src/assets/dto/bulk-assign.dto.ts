import { ArrayMaxSize, IsArray, IsOptional, IsString } from 'class-validator';

export class BulkAssignDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(200, { message: 'Maximum 200 IDs per request' })
  ids: string[];

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}
