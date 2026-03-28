import { IsEmail, IsEnum } from 'class-validator';
import { UserRole } from '../../users/user.entity';

export class CreateInvitationDto {
  @IsEmail()
  email: string;

  @IsEnum(UserRole)
  role: UserRole;
}
