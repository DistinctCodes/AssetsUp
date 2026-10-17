import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationsService } from './notifications.service';

/** Every route is scoped to the authenticated user's own notifications. */
@ApiTags('notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List my notifications (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated notifications' })
  list(
    @GetUser('id') userId: string,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notifications.findPage(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Number of my unread notifications' })
  @ApiResponse({ status: 200, description: '{ count }' })
  unreadCount(@GetUser('id') userId: string) {
    return this.notifications.unreadCount(userId);
  }

  // Declared before `:id/read` so "read-all" is never parsed as an id.
  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  @ApiResponse({ status: 200, description: '{ updated }' })
  readAll(@GetUser('id') userId: string) {
    return this.notifications.markAllAsRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one of my notifications as read' })
  @ApiResponse({ status: 200, description: 'Updated notification' })
  @ApiResponse({ status: 404, description: 'Not found (or not yours)' })
  read(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
  ) {
    return this.notifications.markOwnAsRead(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete one of my notifications' })
  @ApiResponse({ status: 200, description: '{ deleted: true }' })
  @ApiResponse({ status: 404, description: 'Not found (or not yours)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
  ) {
    return this.notifications.removeOwn(id, userId);
  }
}
