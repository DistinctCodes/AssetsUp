import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Borrowing } from './borrowing.entity';
import { BorrowingService } from './borrowing.service';
import { BorrowingController } from './borrowing.controller';
import { Asset } from '../assets/asset.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Borrowing, Asset])],
  controllers: [BorrowingController],
  providers: [BorrowingService],
  exports: [BorrowingService],
})
export class BorrowingModule {}
