import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  passwordHash?: string;

  @IsOptional()
  @IsString()
  googleId?: string;

  @IsOptional()
  @IsString()
  microsoftId?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
