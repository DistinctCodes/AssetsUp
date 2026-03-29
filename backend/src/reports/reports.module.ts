import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from '../assets/asset.entity';
import { Maintenance } from '../assets/maintenance.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, Maintenance])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
