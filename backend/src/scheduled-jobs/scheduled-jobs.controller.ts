/* eslint-disable prettier/prettier */
import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ScheduledJobsService } from './scheduled-jobs.service';
import { UpdateScheduleSettingsDto } from './dto/update-scheduled-settings.dto';

@Controller('scheduled-jobs')
export class ScheduledJobsController {
  constructor(private readonly scheduledJobsService: ScheduledJobsService) {}

  @Get('settings')
  getSettings() {
    return this.scheduledJobsService.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateScheduleSettingsDto) {
    return this.scheduledJobsService.updateSettings(dto);
  }
}
