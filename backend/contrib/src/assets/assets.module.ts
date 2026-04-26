import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from './asset.entity';
import { AssetHistory } from './asset-history.entity';
import { AssetNote } from './asset-note.entity';
import { Maintenance } from './maintenance.entity';
import { AssetDocument } from './asset-document.entity';
import { Category } from '../common/category.entity';
import { Department } from '../common/department.entity';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, AssetHistory, AssetNote, Maintenance, AssetDocument, Category, Department])],
  providers: [AssetsService],
  controllers: [AssetsController],
  exports: [AssetsService],
})
export class AssetsModule {}
