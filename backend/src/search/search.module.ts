import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { InventoryItem } from 'src/inventory/entities/inventory-item.entity';
import { Asset } from 'src/assets/entities/assest.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, InventoryItem])],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
