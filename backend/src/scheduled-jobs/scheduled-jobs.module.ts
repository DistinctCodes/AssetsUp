/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduledJobsController } from './scheduled-jobs.controller';
import { ScheduledJobsService } from './scheduled-jobs.service';
import { ScheduleSettings } from './entities/scheduled-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduleSettings]),
    ScheduleModule.forRoot(), // enables cron support
  ],
  controllers: [ScheduledJobsController],
  providers: [ScheduledJobsService],
})
export class ScheduledJobsModule {}
