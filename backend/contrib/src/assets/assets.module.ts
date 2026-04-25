import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from './asset.entity';
import { AssetHistory } from './asset-history.entity';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, AssetHistory])],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
