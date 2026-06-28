import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ActivityLogService } from './activity-log.service';
import { CreateActivityLogDto } from './dtos/create-activity-log.dto';
import { ActivityLogQueryDto } from './dtos/activity-log-query.dto';

@Controller('activity-logs')
@UseGuards(AuthGuard('jwt'))
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Post()
  async create(@Body() dto: CreateActivityLogDto, @Req() req: any) {
    return this.activityLogService.create({
      ...dto,
      userId: req.user?.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get()
  async findAll(@Query() query: ActivityLogQueryDto) {
    return this.activityLogService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.activityLogService.findById(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.activityLogService.remove(id);
    return { message: 'Activity log deleted successfully' };
  }
}
