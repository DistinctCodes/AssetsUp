import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    @Optional() private readonly auditLogsService?: AuditLogsService,
  ) {}

  async findAll() {
    return this.deptRepo.find();
  }

  async findById(id: string) {
    const dept = await this.deptRepo.findOne({ where: { id } });
    if (!dept) throw new NotFoundException(`Department ${id} not found`);
    return dept;
  }

  async create(dto: Partial<Department>, actorId?: string) {
    if (dto.parentDepartmentId) {
      await this.findById(dto.parentDepartmentId);
    }
    const dept = this.deptRepo.create(dto);
    const saved = await this.deptRepo.save(dept);
    await this.auditLogsService?.logAction({
      action: 'CREATED',
      entityType: 'department',
      entityId: saved.id,
      actorId,
      newValue: { name: saved.name, code: saved.code },
    });
    return saved;
  }

  async update(id: string, dto: Partial<Department>, actorId?: string) {
    const dept = await this.findById(id);
    if (dto.parentDepartmentId && dto.parentDepartmentId === id) {
      throw new BadRequestException('A department cannot be its own parent');
    }
    const previous = { name: dept.name, code: dept.code };
    Object.assign(dept, dto);
    const saved = await this.deptRepo.save(dept);
    await this.auditLogsService?.logAction({
      action: 'UPDATED',
      entityType: 'department',
      entityId: id,
      actorId,
      previousValue: previous,
      newValue: { name: saved.name, code: saved.code },
    });
    return saved;
  }

  async delete(id: string, actorId?: string) {
    const dept = await this.findById(id);
    await this.deptRepo.remove(dept);
    await this.auditLogsService?.logAction({
      action: 'DELETED',
      entityType: 'department',
      entityId: id,
      actorId,
      previousValue: { name: dept.name, code: dept.code },
    });
    return dept;
  }
}
