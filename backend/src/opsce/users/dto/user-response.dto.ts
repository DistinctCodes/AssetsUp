import { User, UserRole } from '../entities/user.entity';

export class UserResponseDto {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  static from(user: User): UserResponseDto {
    const { passwordHash, refreshTokenHash, ...rest } = user as any;
    return rest as UserResponseDto;
  }
}
