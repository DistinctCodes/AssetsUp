import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetTransfer } from './entities/asset-transfer.entity';
import { TransfersService } from './transfers.service';
import { TransfersController } from './transfers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AssetTransfer])],
  providers: [TransfersService],
  controllers: [TransfersController],
  exports: [TransfersService],
})
export class TransfersModule {}
