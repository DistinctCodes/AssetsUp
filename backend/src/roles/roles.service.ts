import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    // Check if role with this name already exists
    const existingRole = await this.roleRepository.findOne({
      where: { name: createRoleDto.name },
    });
    if (existingRole) {
      throw new BadRequestException('Role with this name already exists');
    }

    const role = this.roleRepository.create(createRoleDto);
    return await this.roleRepository.save(role);
  }

  async findAll(): Promise<Role[]> {
    return await this.roleRepository.find({
      where: { isActive: true },
      relations: ['permissions'],
    });
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);
    
    // Prevent updating system roles
    if (role.isSystemRole && updateRoleDto.isSystemRole === false) {
      throw new BadRequestException('Cannot modify system role status');
    }

    await this.roleRepository.update(id, updateRoleDto);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);
    
    // Prevent deletion of system roles
    if (role.isSystemRole) {
      throw new BadRequestException('Cannot delete system roles');
    }

    // Check if role is assigned to any users
    const usersWithRole = await this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.users', 'user')
      .where('role.id = :id', { id })
      .andWhere('user.id IS NOT NULL')
      .getOne();

    if (usersWithRole) {
      throw new BadRequestException('Cannot delete role that is assigned to users');
    }

    await this.roleRepository.softDelete(id);
  }

  async assignPermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    const role = await this.findOne(roleId);
    
    const permissions = await this.permissionRepository.findByIds(permissionIds);
    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('One or more permissions not found');
    }

    role.permissions = permissions;
    return await this.roleRepository.save(role);
  }

  async getPermissions(roleId: string): Promise<Permission[]> {
    const role = await this.findOne(roleId);
    return role.permissions;
  }

  async findByName(name: string): Promise<Role | undefined> {
    return await this.roleRepository.findOne({
      where: { name },
      relations: ['permissions'],
    });
  }
}