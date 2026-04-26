import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class TransferAssetDto {
  @IsNotEmpty()
  @IsUUID()
  departmentId: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
