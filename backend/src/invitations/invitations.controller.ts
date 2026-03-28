import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { User, UserRole } from '../users/user.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@ApiTags('Invitations')
@ApiBearerAuth('JWT-auth')
@UseGuards(CombinedAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new invitation' })
  create(@CurrentUser() user: User, @Body() dto: CreateInvitationDto) {
    return this.invitationsService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List pending invitations' })
  findPending() {
    return this.invitationsService.findPending();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an invitation' })
  revoke(@Param('id') id: string) {
    return this.invitationsService.revoke(id);
  }
}
