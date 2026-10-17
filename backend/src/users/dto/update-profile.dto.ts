import { ApiProperty } from '@nestjs/swagger';
import { IsMaxBytes } from '../../common/validators/is-max-bytes.validator';
import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'John', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: 'OldPassword123!', required: false })
  @IsString()
  @MaxLength(1024)
  @IsOptional()
  currentPassword?: string;

  @ApiProperty({ example: 'NewPassword456!', required: false, minimum: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsMaxBytes(72)
  @IsOptional()
  newPassword?: string;
}
