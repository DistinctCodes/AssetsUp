import { Module } from '@nestjs/common';
import { AssetLifecycleService } from './asset-lifecycle.service';
import { AssetStatusController } from './asset-status.controller';

@Module({
  providers: [AssetLifecycleService],
  controllers: [AssetStatusController],
  exports: [AssetLifecycleService],
})
export class AssetsLifecycleModule {}
