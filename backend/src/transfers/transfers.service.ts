import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AssetTransfer,
  TransferStatus,
} from './entities/asset-transfer.entity';
import { PaginationQueryDto, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class TransfersService {
  constructor(
    @InjectRepository(AssetTransfer)
    private readonly transferRepo: Repository<AssetTransfer>,
  ) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResponse<AssetTransfer>> {
    const { page = 1, limit = 20 } = query;
    const [items, total] = await this.transferRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const tr = await this.transferRepo.findOne({ where: { id } });
    if (!tr) throw new NotFoundException(`Transfer ${id} not found`);
    return tr;
  }

  async create(dto: Partial<AssetTransfer>) {
    const tr = this.transferRepo.create({
      ...dto,
      status: TransferStatus.PENDING,
    });
    return this.transferRepo.save(tr);
  }

  async approve(id: string, approverUserId: string) {
    const tr = await this.findById(id);
    if (tr.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Only pending transfers can be approved');
    }
    tr.status = TransferStatus.APPROVED;
    tr.approvedByUserId = approverUserId;
    return this.transferRepo.save(tr);
  }

  async reject(id: string, reason: string) {
    const tr = await this.findById(id);
    if (tr.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Only pending transfers can be rejected');
    }
    tr.status = TransferStatus.REJECTED;
    tr.rejectionReason = reason;
    return this.transferRepo.save(tr);
  }
}