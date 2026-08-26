import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetTransfer } from './entities/asset-transfer.entity';
import { Asset } from '../assets/entities/asset.entity';
import { TransfersService } from './transfers.service';
import { TransfersController } from './transfers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AssetTransfer, Asset])],
  providers: [TransfersService],
  controllers: [TransfersController],
  exports: [TransfersService],
})
export class TransfersModule {}
