import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationPreferenceService } from './notification-preference.service';

@Controller('users/me/notification-preferences')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly prefService: NotificationPreferenceService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.prefService.findByUser(req.user?.id);
  }

  @Put()
  upsertAll(
    @Req() req: any,
    @Body()
    body: {
      preferences: { channel: string; enabled: boolean; events?: string[] }[];
    },
  ) {
    return this.prefService.upsertAll(req.user?.id, body.preferences);
  }

  @Post('reset')
  reset(@Req() req: any) {
    return this.prefService.reset(req.user?.id);
  }
}
