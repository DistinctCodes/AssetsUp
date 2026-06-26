import { IsArray, IsOptional, IsString } from 'class-validator';

export class BulkTransferDto {
  @IsArray()
  ids: string[];

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
