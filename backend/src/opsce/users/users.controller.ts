import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from './entities/user.entity';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async me(@Request() req) {
    const user = await this.usersService.findById(req.user.sub);
    if (!user) throw new NotFoundException();
    return UserResponseDto.from(user);
  }

  @Patch('me')
  async updateMe(@Request() req, @Body() body: UpdateProfileDto) {
    const user = await this.usersService.updateProfile(req.user.sub, body as any);
    return UserResponseDto.from(user);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async list(@Query('page') page = '1', @Query('perPage') perPage = '20') {
    const p = parseInt(page, 10) || 1;
    const pp = parseInt(perPage, 10) || 20;
    const result = await this.usersService.list(p, pp);
    return {
      total: result.total,
      items: result.items.map(UserResponseDto.from),
    };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() body: CreateUserDto) {
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await this.usersService.create({
      email: body.email,
      fullName: body.fullName,
      role: body.role ?? UserRole.VIEWER,
      passwordHash,
    } as any);
    return UserResponseDto.from(user);
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async changeRole(@Param('id') id: string, @Body() body: ChangeRoleDto) {
    const user = await this.usersService.changeRole(id, body.role);
    return UserResponseDto.from(user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.usersService.softDelete(id);
    return { message: 'User soft-deleted' };
  }
}
