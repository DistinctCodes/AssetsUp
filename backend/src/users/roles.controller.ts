import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dtos/create-role.dto';
import { RolesGuard } from './guards/roles.guard';
import { RequirePermissions } from './decorators/roles.decorator';

@Controller('roles')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class RolesController {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  @Get()
  async findAll() {
    return this.roleRepository.find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.roleRepository.findOne({ where: { id } });
  }

  @Post()
  @RequirePermissions('roles:create')
  async create(@Body() dto: CreateRoleDto) {
    const role = this.roleRepository.create(dto);
    return this.roleRepository.save(role);
  }

  @Put(':id')
  @RequirePermissions('roles:update')
  async update(@Param('id') id: string, @Body() dto: CreateRoleDto) {
    await this.roleRepository.update(id, dto);
    return this.roleRepository.findOne({ where: { id } });
  }

  @Delete(':id')
  @RequirePermissions('roles:delete')
  async remove(@Param('id') id: string) {
    await this.roleRepository.delete(id);
    return { message: 'Role deleted' };
  }
}
