import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { Action } from '../entities/permission.entity';

export class CreatePermissionDto {
  @IsString()
  @MaxLength(50)
  resource: string;

  @IsEnum(Action)
  action: Action;

  @IsOptional()
  conditions?: Record<string, any>;

  @IsOptional()
  @IsString()
  description?: string;
}