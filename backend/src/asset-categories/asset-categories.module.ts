import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetCategory } from './asset-category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssetCategory]),
  ],
  exports: [TypeOrmModule],
})
export class AssetCategoriesModule {}