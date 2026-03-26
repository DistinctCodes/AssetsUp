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

export interface DepartmentWithCount extends Department {
  assetCount: number;
}

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly repo: Repository<Department>,
  ) {}

  async findAll(): Promise<DepartmentWithCount[]> {
    const rows: (Department & { assetCount: string })[] = await this.repo.query(`
      SELECT d.*, COALESCE(COUNT(a.id), 0)::int AS "assetCount"
      FROM departments d
      LEFT JOIN assets a ON a."departmentId" = d.id
      GROUP BY d.id
      ORDER BY d.name ASC
    `);
    return rows.map((r) => ({ ...r, assetCount: Number(r.assetCount) }));
  }

  async findOne(id: string): Promise<Department> {
    const dept = await this.repo.findOne({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async create(dto: CreateDepartmentDto): Promise<Department> {
    await this.ensureNameUnique(dto.name);
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const dept = await this.findOne(id);
    if (dto.name && dto.name !== dept.name) {
      await this.ensureNameUnique(dto.name);
    }

    Object.assign(dept, dto);
    return this.repo.save(dept);
  }

  async remove(id: string): Promise<void> {
    const dept = await this.findOne(id);
    await this.repo.remove(dept);
  }

  private async ensureNameUnique(name: string): Promise<void> {
    const existing = await this.repo.findOne({ where: { name } });
    if (existing) {
      throw new ConflictException('A department with this name already exists');
    }
  }
}
