import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
  ) {}

  async findAll() {
    return this.deptRepo.find();
  }

  async findById(id: string) {
    const dept = await this.deptRepo.findOne({ where: { id } });
    if (!dept) throw new NotFoundException(`Department ${id} not found`);
    return dept;
  }

  async create(dto: Partial<Department>) {
    if (dto.parentDepartmentId) {
      await this.findById(dto.parentDepartmentId);
    }
    const dept = this.deptRepo.create(dto);
    return this.deptRepo.save(dept);
  }

  async update(id: string, dto: Partial<Department>) {
    const dept = await this.findById(id);
    if (dto.parentDepartmentId && dto.parentDepartmentId === id) {
      throw new BadRequestException('A department cannot be its own parent');
    }
    Object.assign(dept, dto);
    return this.deptRepo.save(dept);
  }

  async delete(id: string) {
    const dept = await this.findById(id);
    return this.deptRepo.remove(dept);
  }
}
