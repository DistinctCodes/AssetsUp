import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { PaginationQueryDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { Asset } from '../assets/entities/asset.entity';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
  ) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResponse<Branch>> {
    const { page = 1, limit = 20, search } = query;
    const where = search ? { name: ILike(`%${search}%`) } : {};
    const [items, total] = await this.branchRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const branch = await this.branchRepo.findOne({ where: { id } });
    if (!branch) throw new NotFoundException(`Branch ${id} not found`);
    return branch;
  }

  async create(dto: Partial<Branch>) {
    const branch = this.branchRepo.create(dto);
    return this.branchRepo.save(branch);
  }

  async update(id: string, dto: Partial<Branch>) {
    const branch = await this.findById(id);
    Object.assign(branch, dto);
    return this.branchRepo.save(branch);
  }

  async delete(id: string) {
    const branch = await this.findById(id);
    const assetCount = await this.assetRepo.count({
      where: { branchId: id },
    });
    if (assetCount > 0) {
      throw new BadRequestException(
        `Cannot delete branch: ${assetCount} asset(s) are still assigned to it`,
      );
    }
    return this.branchRepo.remove(branch);
  }
}
