import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetTransfersController } from './asset-transfers.controller';
import { AssetTransfersService } from './asset-transfers.service';
import { AssetTransfer } from './entities/asset-transfer.entity';
import { Notification } from './entities/notification.entity';
import { TransferHistory } from './entities/transfer-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssetTransfer, Notification, TransferHistory]),
  ],
  controllers: [AssetTransfersController],
  providers: [AssetTransfersService],
  exports: [AssetTransfersService],
})
export class AssetTransfersModule {}