import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('reservations')
@ApiBearerAuth('JWT-auth')
@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a reservation' })
  @ApiResponse({ status: 201, description: 'Reservation created' })
  @ApiResponse({ status: 409, description: 'Time window conflict' })
  create(
    @Body()
    dto: {
      assetId: string;
      startsAt: string;
      endsAt: string;
      purpose?: string;
    },
    @GetUser() user: User,
  ) {
    return this.reservationsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List reservations with filters' })
  @ApiResponse({ status: 200, description: 'List of reservations' })
  findAll(
    @Query('assetId') assetId?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    return this.reservationsService.findAll({
      assetId,
      userId,
      from,
      to,
      status,
    });
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a reservation' })
  @ApiResponse({ status: 200, description: 'Reservation cancelled' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  cancel(@Param('id') id: string, @GetUser() user: User) {
    return this.reservationsService.cancel(id, user.id, user.role);
  }

  @Patch(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Confirm a reservation (ADMIN/MANAGER only)' })
  @ApiResponse({ status: 200, description: 'Reservation confirmed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  confirm(@Param('id') id: string, @GetUser() user: User) {
    return this.reservationsService.confirm(id, user.role);
  }
}
