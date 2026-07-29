import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetHistoryEvent } from './entities/asset-history-event.entity';
import { AssetHistoryService } from './asset-history.service';

@Module({
  imports: [TypeOrmModule.forFeature([AssetHistoryEvent])],
  providers: [AssetHistoryService],
  exports: [AssetHistoryService],
})
export class AssetHistoryModule {}
