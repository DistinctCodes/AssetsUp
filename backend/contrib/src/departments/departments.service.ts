import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
  ) {}

  async findAll(): Promise<(Department & { assetCount: number })[]> {
    const rows = await this.deptRepo
      .createQueryBuilder('d')
      .leftJoin('assets', 'a', 'a.departmentId = d.id')
      .addSelect('COUNT(a.id)', 'assetCount')
      .groupBy('d.id')
      .getRawAndEntities();

    return rows.entities.map((dept, i) => ({
      ...dept,
      assetCount: parseInt(rows.raw[i]?.assetCount ?? '0', 10),
    }));
  }

  async findOne(id: string): Promise<Department & { assetCount: number }> {
    const rows = await this.deptRepo
      .createQueryBuilder('d')
      .leftJoin('assets', 'a', 'a.departmentId = d.id')
      .addSelect('COUNT(a.id)', 'assetCount')
      .where('d.id = :id', { id })
      .groupBy('d.id')
      .getRawAndEntities();

    if (!rows.entities.length) throw new NotFoundException('Department not found');
    return { ...rows.entities[0], assetCount: parseInt(rows.raw[0]?.assetCount ?? '0', 10) };
  }

  async create(dto: CreateDepartmentDto): Promise<Department> {
    const existing = await this.deptRepo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Department name already taken');
    const dept = this.deptRepo.create(dto);
    return this.deptRepo.save(dept);
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const dept = await this.deptRepo.findOne({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found');
    Object.assign(dept, dto);
    return this.deptRepo.save(dept);
  }

  async remove(id: string): Promise<void> {
    const dept = await this.deptRepo.findOne({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found');
    await this.deptRepo.remove(dept);
  }
}
