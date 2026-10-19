import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

// The frontend sends lowercase role names ("staff"); accept those as well as
// the canonical enum values.
const ROLE_ALIASES: Record<string, UserRole> = {
  admin: UserRole.ADMIN,
  manager: UserRole.MANAGER,
  staff: UserRole.EMPLOYEE,
  employee: UserRole.EMPLOYEE,
};

export class InviteUserDto {
  @ApiProperty({ example: 'new.hire@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ enum: UserRole })
  @Transform(({ value }) =>
    typeof value === 'string' ? (ROLE_ALIASES[value.toLowerCase()] ?? value) : value,
  )
  @IsEnum(UserRole)
  role: UserRole;
}
