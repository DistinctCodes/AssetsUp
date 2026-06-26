import { IsString, Length } from 'class-validator';

export class EnableTwoFactorDto {
  @IsString()
  @Length(6, 6)
  code: string;
}