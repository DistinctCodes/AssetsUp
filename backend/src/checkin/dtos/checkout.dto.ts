import { IsString, IsOptional } from 'class-validator';

export class CheckoutDto {
  @IsString()
  assetId: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
