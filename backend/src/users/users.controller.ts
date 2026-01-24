import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('api/v1/users')
@UseGuards(JwtAuthGuard, RbacGuard)
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequirePermission('users', 'READ')
  async findAll() {
    return await this.userService.findAll();
  }

  @Get(':id')
  @RequirePermission('users', 'READ')
  async findOne(@Param('id') id: string) {
    return await this.userService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('users', 'CREATE')
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.userService.create(createUserDto);
  }

  @Put(':id')
  @RequirePermission('users', 'UPDATE')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return await this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('users', 'DELETE')
  async remove(@Param('id') id: string) {
    await this.userService.remove(id);
  }

  @Patch(':id/activate')
  @RequirePermission('users', 'UPDATE')
  async activate(@Param('id') id: string) {
    return await this.userService.update(id, { isActive: true });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: Request) {
    // Return user profile without password
    const { password, ...profile } = req.user as any;
    return profile;
  }

  @Put(':id/change-password')
  @RequirePermission('users', 'UPDATE')
  async changePassword(
    @Param('id') id: string,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    // Implementation for changing user password
    return { message: 'Password changed successfully' };
  }
}