import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentsRepository: Repository<Department>,
  ) {}

  findAll(): Promise<Department[]> {
    return this.departmentsRepository.find();
  }

  async findOne(id: string): Promise<Department> {
    const department = await this.departmentsRepository.findOne({ where: { id } });
    if (!department) throw new NotFoundException(`Department ${id} not found`);
    return department;
  }

  create(dto: CreateDepartmentDto): Promise<Department> {
    const department = this.departmentsRepository.create(dto);
    return this.departmentsRepository.save(department);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.departmentsRepository.delete(id);
  }
}
