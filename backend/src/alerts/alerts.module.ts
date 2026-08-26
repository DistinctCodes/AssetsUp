import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ExpiryAlertsService } from './expiry-alerts.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [ExpiryAlertsService],
  exports: [ExpiryAlertsService],
})
export class AlertsModule {}
