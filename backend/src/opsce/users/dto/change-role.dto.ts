import { IsEnum } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class ChangeRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}
