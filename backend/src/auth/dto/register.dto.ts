import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsMaxBytes } from '../../common/validators/is-max-bytes.validator';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { normalizeEmailTransform } from '../../users/utils/normalize-email';

export class RegisterDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'user@example.com' })
  @Transform(normalizeEmailTransform)
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!', minimum: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsMaxBytes(72)
  password: string;
}
