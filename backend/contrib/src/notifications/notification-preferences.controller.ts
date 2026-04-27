import { Body, Controller, Get, Patch, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationPreferencesController {
  constructor(private readonly preferencesService: NotificationPreferencesService) {}

  private getUserId(req: { user?: { id?: string } }): string {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User context is missing');
    }
    return userId;
  }

  @Get('preferences')
  getPreferences(@Req() req: { user?: { id?: string } }) {
    return this.preferencesService.getForUser(this.getUserId(req));
  }

  @Patch('preferences')
  updatePreferences(
    @Req() req: { user?: { id?: string } },
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.preferencesService.updateForUser(this.getUserId(req), dto);
  }
}
