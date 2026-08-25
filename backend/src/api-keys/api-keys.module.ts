import { Module } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKeyGuard } from './api-key.guard';

@Module({
  providers: [ApiKeysService, ApiKeyGuard],
  exports: [ApiKeysService, ApiKeyGuard],
})
export class ApiKeysModule {}
