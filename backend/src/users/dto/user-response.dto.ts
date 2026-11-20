import { ApiProperty } from '@nestjs/swagger';
import { User, UserRole } from '../entities/user.entity';

/**
 * The only shape in which a user leaves the API.
 *
 * It is an allow-list, built field by field: a column added to the `User`
 * entity later is NOT exposed until it is added here on purpose. The previous
 * deny-list (`const { passwordHash, refreshTokenHash, ...safe } = user`) leaked
 * every newly added secret column by default, including the password-reset /
 * invite token hash and its expiry.
 */
export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'user@example.com' }) email: string;
  @ApiProperty({ example: 'John' }) firstName: string;
  @ApiProperty({ example: 'Doe' }) lastName: string;
  @ApiProperty({ enum: UserRole }) role: UserRole;
  @ApiProperty({ required: false }) departmentId?: string;
  @ApiProperty({ required: false }) branchId?: string;
  @ApiProperty({ required: false }) avatarUrl?: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty({ required: false }) lastLoginAt?: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export function toUserResponse(user: User): UserResponseDto {
  const response = new UserResponseDto();
  response.id = user.id;
  response.email = user.email;
  response.firstName = user.firstName;
  response.lastName = user.lastName;
  response.role = user.role;
  response.departmentId = user.departmentId;
  response.branchId = user.branchId;
  response.avatarUrl = user.avatarUrl;
  response.isActive = user.isActive;
  response.lastLoginAt = user.lastLoginAt;
  response.createdAt = user.createdAt;
  response.updatedAt = user.updatedAt;
  return response;
}
