import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum } from 'class-validator';
import { UserRole } from '../entities/user.entity';
import { normalizeRole } from './role-alias';

export class UpdateRoleDto {
  @ApiProperty({
    enum: UserRole,
    description: 'Case-insensitive; "staff" is accepted for EMPLOYEE',
  })
  @Transform(({ value }) => normalizeRole(value))
  @IsEnum(UserRole, {
    message: `role must be one of: ${Object.values(UserRole).join(', ')}`,
  })
  role: UserRole;
}
