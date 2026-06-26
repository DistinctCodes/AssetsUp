import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from './entities/asset.entity';
import { AssetNote } from './entities/asset-note.entity';
import { AssetsOpsService } from './assets-ops.service';
import { AssetsOpsController } from './assets-ops.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, AssetNote])],
  controllers: [AssetsOpsController],
  providers: [AssetsOpsService],
  exports: [AssetsOpsService],
})
export class AssetsOpsModule {}
