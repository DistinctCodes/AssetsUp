import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  assetId: string;

  @IsString()
  @IsOptional()
  assignedToUserId?: string;

  @IsString()
  @IsOptional()
  assignedToDepartmentId?: string;
}