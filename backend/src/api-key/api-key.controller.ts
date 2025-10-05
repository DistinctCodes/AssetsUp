/* eslint-disable prettier/prettier */
import { Controller, Post, Body, Param, Get, Delete } from '@nestjs/common';
import { ApiKeysService } from './api-key.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RevokeApiKeyDto } from './dto/revoke-api-key.dto';

@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  async create(@Body() dto: CreateApiKeyDto) {
    return this.apiKeysService.createKey(dto);
  }

  @Delete()
  async revoke(@Body() dto: RevokeApiKeyDto) {
    return this.apiKeysService.revokeKey(dto);
  }

  @Get(':companyId')
  async list(@Param('companyId') companyId: string) {
    return this.apiKeysService.listKeys(companyId);
  }
}
