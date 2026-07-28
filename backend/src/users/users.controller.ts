import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserRole } from './entities/user.entity';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users (paginated, searchable)' })
  findAll(
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.findAll({ search, role, page, limit });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      return { id: 'demo-user-id', email: 'user@example.com', role: UserRole.ADMIN, firstName: 'Demo', lastName: 'User' };
    }
    const user = await this.usersService.findById(userId);
    return this.usersService.sanitize(user);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: "Change a user's role" })
  updateRole(
    @Param('id') id: string,
    @Body('role') role: UserRole,
    @Req() req: any,
  ) {
    const requestingUserId = req.user?.id || req.user?.sub;
    return this.usersService.updateRole(id, role, requestingUserId);
  }
}
