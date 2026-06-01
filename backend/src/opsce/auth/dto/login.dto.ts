import { IsEmail, IsString } from 'class-validator';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
  @MinLength(8)
  password: string;
}
