import { IsString, MinLength, IsUUID } from 'class-validator';

export class ResetPasswordDto {
  @IsUUID()
  token: string;

  @IsString()
  @MinLength(8)
  password: string;
}
