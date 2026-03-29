import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TwoFactorCodeDto {
  @ApiProperty({ example: '123456', description: '6-digit TOTP code' })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class TwoFactorVerifyDto {
  @ApiProperty({ description: 'Temporary token from login response' })
  @IsString()
  tempToken: string;

  @ApiProperty({ example: '123456', description: '6-digit TOTP code' })
  @IsString()
  @Length(6, 6)
  code: string;
}
