import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    // Check if permission already exists
    const existingPermission = await this.permissionRepository.findOne({
      where: {
        resource: createPermissionDto.resource,
        action: createPermissionDto.action,
      },
    });
    
    if (existingPermission) {
      throw new BadRequestException('Permission already exists');
    }

    const permission = this.permissionRepository.create(createPermissionDto);
    return await this.permissionRepository.save(permission);
  }

  async findAll(): Promise<Permission[]> {
    return await this.permissionRepository.find();
  }

  async findOne(id: string): Promise<Permission> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });
    
    if (!permission) {
      throw new BadRequestException(`Permission with ID ${id} not found`);
    }
    
    return permission;
  }

  async update(id: string, updatePermissionDto: UpdatePermissionDto): Promise<Permission> {
    const permission = await this.findOne(id);
    
    // Prevent updating resource and action for existing permissions
    if (
      updatePermissionDto.resource && 
      updatePermissionDto.resource !== permission.resource
    ) {
      throw new BadRequestException('Cannot update resource of existing permission');
    }
    
    if (
      updatePermissionDto.action && 
      updatePermissionDto.action !== permission.action
    ) {
      throw new BadRequestException('Cannot update action of existing permission');
    }

    await this.permissionRepository.update(id, updatePermissionDto);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const permission = await this.findOne(id);
    
    // Check if permission is assigned to any roles
    // We'll need to check this by querying the join table
    const rolesWithPermission = await this.permissionRepository
      .createQueryBuilder('permission')
      .leftJoinAndSelect('permission.roles', 'role')
      .where('permission.id = :id', { id })
      .getOne();

    if (rolesWithPermission && rolesWithPermission.roles && rolesWithPermission.roles.length > 0) {
      throw new BadRequestException('Cannot delete permission that is assigned to roles');
    }

    await this.permissionRepository.delete(id);
  }
}