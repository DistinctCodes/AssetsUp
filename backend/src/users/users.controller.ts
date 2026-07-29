import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserRole } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users (paginated, searchable)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  findAll(
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.findAll({ search, role, page, limit });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getProfile(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      return {
        id: 'demo-user-id',
        email: 'user@example.com',
        role: UserRole.ADMIN,
        firstName: 'Demo',
        lastName: 'User',
      };
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
}
