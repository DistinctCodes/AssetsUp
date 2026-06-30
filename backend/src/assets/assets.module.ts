import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from './entities/asset.entity';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { AssetsImportController } from './assets-import.controller';
import { AssetsImportService } from './assets-import.service';
import { Category } from '../categories/entities/category.entity';
import { Department } from '../users/entities/department.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, Category, Department])],
  controllers: [AssetsController, AssetsImportController],
  providers: [AssetsService, AssetsImportService],
  exports: [AssetsService],
})
export class AssetsModule {}