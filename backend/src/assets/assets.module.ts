import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from './asset.entity';
import { AssetHistory } from './asset-history.entity';
import { AssetNote } from './asset-note.entity';
import { Maintenance } from './maintenance.entity';
import { AssetDocument } from './asset-document.entity';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { DepartmentsModule } from '../departments/departments.module';
import { CategoriesModule } from '../categories/categories.module';
import { UsersModule } from '../users/users.module';
import { StellarModule } from '../stellar/stellar.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Asset, AssetHistory, AssetNote, Maintenance, AssetDocument]),
    DepartmentsModule,
    CategoriesModule,
    UsersModule,
    StellarModule,
  ],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
