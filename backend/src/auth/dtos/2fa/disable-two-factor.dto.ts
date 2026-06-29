import { IsString, Length } from 'class-validator';

export class DisableTwoFactorDto {
  @IsString()
  @Length(6, 6)
  code: string;
}
