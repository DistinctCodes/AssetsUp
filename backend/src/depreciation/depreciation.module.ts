import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from '../assets/entities/asset.entity';
import { DepreciationPosting } from './entities/depreciation-posting.entity';
import { DepreciationService } from './depreciation.service';
import { DepreciationSchedulerService } from './depreciation-scheduler.service';
import { DepreciationController } from './depreciation.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, DepreciationPosting])],
  providers: [DepreciationService, DepreciationSchedulerService],
  controllers: [DepreciationController],
  exports: [DepreciationService],
})
export class DepreciationModule {}
