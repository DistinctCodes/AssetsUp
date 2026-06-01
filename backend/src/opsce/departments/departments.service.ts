import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Asset, AssetStatus } from '../assets/entities/asset.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    // Validate parent exists if parentId is provided
    if (createDepartmentDto.parentId) {
      const parent = await this.departmentRepository.findOne({
        where: { id: createDepartmentDto.parentId },
      });
      if (!parent) {
        throw new BadRequestException('Parent department not found');
      }
    }

    const department = this.departmentRepository.create(createDepartmentDto);
    return this.departmentRepository.save(department);
  }

  async findAll(): Promise<Department[]> {
    const departments = await this.departmentRepository.find({
      order: { name: 'ASC' },
    });

    // Add childCount to each department
    return departments.map((dept) => {
      const childCount = departments.filter(
        (d) => d.parentId === dept.id,
      ).length;
      return { ...dept, childCount };
    });
  }

  async findOne(id: string): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: ['children'],
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    // Get asset count for this department
    const assetCount = await this.assetRepository.count({
      where: { departmentId: id, status: AssetStatus.ACTIVE },
    });

    return { ...department, assetCount } as Department & { assetCount: number };
  }

  async update(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    // Validate parent exists if parentId is being updated
    if (updateDepartmentDto.parentId) {
      // Prevent setting parent to itself
      if (updateDepartmentDto.parentId === id) {
        throw new BadRequestException('Department cannot be its own parent');
      }

      const parent = await this.departmentRepository.findOne({
        where: { id: updateDepartmentDto.parentId },
      });
      if (!parent) {
        throw new BadRequestException('Parent department not found');
      }

      // Prevent circular references
      if (updateDepartmentDto.parentId) {
        await this.checkCircularReference(id, updateDepartmentDto.parentId);
      }
    }

    Object.assign(department, updateDepartmentDto);
    return this.departmentRepository.save(department);
  }

  async remove(id: string): Promise<void> {
    const department = await this.departmentRepository.findOne({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    // Check if department has active assets
    const activeAssetCount = await this.assetRepository.count({
      where: { departmentId: id, status: AssetStatus.ACTIVE },
    });

    if (activeAssetCount > 0) {
      throw new ConflictException(
        `Cannot delete department with ${activeAssetCount} active asset(s)`,
      );
    }

    await this.departmentRepository.remove(department);
  }

  /**
   * Check for circular references in department hierarchy
   */
  private async checkCircularReference(
    departmentId: string,
    newParentId: string,
  ): Promise<void> {
    let currentParentId: string | null = newParentId;

    while (currentParentId) {
      if (currentParentId === departmentId) {
        throw new BadRequestException(
          'Circular reference detected: cannot set parent to a child department',
        );
      }

      const parent = await this.departmentRepository.findOne({
        where: { id: currentParentId },
      });

      currentParentId = parent?.parentId ?? null;
    }
  }
}
