import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetTransfersService } from './asset-transfers.service';
import { AssetTransfersController } from './asset-transfers.controller';
import { AssetTransfer } from './entities/asset-transfer.entity';
import { InventoryItem } from 'src/inventory/entities/inventory-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AssetTransfer, InventoryItem])],
  controllers: [AssetTransfersController],
  providers: [AssetTransfersService],
})
export class AssetTransfersModule {}
