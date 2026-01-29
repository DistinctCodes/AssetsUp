import { IsOptional, IsString } from 'class-validator';

export class ApproveTransferDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
