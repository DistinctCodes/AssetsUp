import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiEnvelope, ApiErrorEnvelope } from '../common/swagger/api-envelope.decorator';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { InviteUserDto } from './dto/invite-user.dto';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users (paginated, searchable)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  findAll(@Query() query: ListUsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiEnvelope(User, { description: 'Current user profile' })
  @ApiErrorEnvelope(401, 'Missing or invalid token')
  async getProfile(@GetUser('id') userId?: string) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const user = await this.usersService.findById(userId);
    return this.usersService.sanitize(user);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update own profile (firstName, lastName, password)',
  })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  updateMe(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const userId = req.user?.id || req.user?.sub;
    return this.usersService.updateMe(userId, dto);
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: "Change a user's role" })
  @ApiResponse({ status: 200, description: 'Role updated' })
  updateRole(
    @Param('id') id: string,
    @Body('role') role: UserRole,
    @Req() req: any,
  ) {
    const requestingUserId = req.user?.id || req.user?.sub;
    return this.usersService.updateRole(id, role, requestingUserId);
  }

  @Post('invite')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Invite a new user (admin only)' })
  @ApiResponse({ status: 201, description: 'User invited' })
  @ApiResponse({ status: 403, description: 'Not an admin' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  invite(@Body() dto: InviteUserDto, @Req() req: any) {
    const requestingUserId = req.user?.id || req.user?.sub;
    return this.usersService.invite(dto, requestingUserId);
  }

  @Patch(':id/active')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Activate or deactivate a user (admin only)' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 403, description: 'Not an admin, or self-deactivation' })
  @ApiResponse({ status: 404, description: 'User not found' })
  setActive(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
    @Req() req: any,
  ) {
    const requestingUserId = req.user?.id || req.user?.sub;
    return this.usersService.setActive(id, isActive === true, requestingUserId);
  }
}
