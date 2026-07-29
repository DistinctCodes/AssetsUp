import { IsOptional, IsString } from 'class-validator';

export class CreateAuditSessionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;
}
