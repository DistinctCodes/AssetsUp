import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { License } from './entities/license.entity';
import { LicensesService } from './services/licenses.service';
import { LicensesController } from './licenses.controller';
import { LicenseExpiryTask } from './tasks/license-expiry.task';

@Module({
  imports: [
    TypeOrmModule.forFeature([License]),
    ScheduleModule.forRoot(), // Initialize the scheduler
  ],
  controllers: [LicensesController],
  providers: [LicensesService, LicenseExpiryTask],
})
export class LicensesModule {}