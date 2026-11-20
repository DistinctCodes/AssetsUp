import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { Asset } from '../assets/entities/asset.entity';
import { User } from '../users/entities/user.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PaginationQueryDto, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Optional() private readonly auditLogsService?: AuditLogsService,
  ) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResponse<Department>> {
    const { page = 1, limit = 20, search } = query;
    const where = search ? { name: ILike(`%${search}%`) } : {};
    const [items, total] = await this.deptRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
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
    if (dto.parentDepartmentId) {
      await this.assertNoCircularReference(id, dto.parentDepartmentId);
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

  /**
   * Rejects making `proposedParentId` the parent of `departmentId` when that
   * would create a cycle, directly (its own parent) or indirectly (the
   * department already appears among the proposed parent's ancestors).
   */
  private async assertNoCircularReference(
    departmentId: string,
    proposedParentId: string,
  ) {
    if (proposedParentId === departmentId) {
      throw new BadRequestException('A department cannot be its own parent');
    }

    // A chain can't be longer than the number of departments without already
    // containing a cycle, so the bound also stops a loop that already exists in data.
    const maxDepth = await this.deptRepo.count();

    let currentId: string | null | undefined = proposedParentId;
    for (let depth = 0; currentId && depth <= maxDepth; depth++) {
      if (currentId === departmentId) {
        throw new BadRequestException(
          'This change would create a circular department hierarchy',
        );
      }
      const current: Department | null = await this.deptRepo.findOne({
        where: { id: currentId },
      });
      currentId = current?.parentDepartmentId ?? null;
    }
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

  /** Assets belonging to a department, newest first. */
  async findAssets(
    id: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<Asset>> {
    await this.findById(id);
    const { page = 1, limit = 20 } = query;
    const [items, total] = await this.assetRepo.findAndCount({
      where: { departmentId: id },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Users in a department. Only non-sensitive columns are selected. */
  async findUsers(
    id: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<Partial<User>>> {
    await this.findById(id);
    const { page = 1, limit = 20 } = query;
    const [items, total] = await this.userRepo.findAndCount({
      where: { departmentId: id },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'role',
        'isActive',
        'departmentId',
        'avatarUrl',
      ],
      skip: (page - 1) * limit,
      take: limit,
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
