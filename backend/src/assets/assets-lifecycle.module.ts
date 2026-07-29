import { Module } from '@nestjs/common';
import { AssetLifecycleService } from './asset-lifecycle.service';

@Module({
  providers: [AssetLifecycleService],
  exports: [AssetLifecycleService],
})
export class AssetsLifecycleModule {}
