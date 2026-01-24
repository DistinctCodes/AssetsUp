import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('api/v1/roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission('roles', 'READ')
  async findAll() {
    return await this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermission('roles', 'READ')
  async findOne(@Param('id') id: string) {
    return await this.rolesService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('roles', 'CREATE')
  async create(@Body() createRoleDto: CreateRoleDto) {
    return await this.rolesService.create(createRoleDto);
  }

  @Put(':id')
  @RequirePermission('roles', 'UPDATE')
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return await this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('roles', 'DELETE')
  async remove(@Param('id') id: string) {
    await this.rolesService.remove(id);
  }

  @Post(':id/permissions')
  @RequirePermission('roles', 'UPDATE')
  async assignPermissions(
    @Param('id') roleId: string,
    @Body('permissionIds') permissionIds: string[],
  ) {
    return await this.rolesService.assignPermissions(roleId, permissionIds);
  }

  @Get(':id/permissions')
  @RequirePermission('roles', 'READ')
  async getPermissions(@Param('id') roleId: string) {
    return await this.rolesService.getPermissions(roleId);
  }
}