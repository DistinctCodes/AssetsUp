/* eslint-disable prettier/prettier */
import { IsUUID } from 'class-validator';

export class RevokeApiKeyDto {
  @IsUUID()
  apiKeyId: string;
}
