import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from '../assets/entities/asset.entity';
import { DepreciationService } from './depreciation.service';
import { DepreciationController } from './depreciation.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Asset])],
  providers: [DepreciationService],
  controllers: [DepreciationController],
  exports: [DepreciationService],
})
export class DepreciationModule {}
