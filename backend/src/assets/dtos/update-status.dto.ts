import { IsString, IsOptional } from 'class-validator';

export class UpdateStatusDto {
  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
