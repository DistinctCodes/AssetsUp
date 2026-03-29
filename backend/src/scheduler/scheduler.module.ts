import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from '../assets/asset.entity';
import { Maintenance } from '../assets/maintenance.entity';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, Maintenance])],
  providers: [SchedulerService],
})
export class SchedulerModule {}
