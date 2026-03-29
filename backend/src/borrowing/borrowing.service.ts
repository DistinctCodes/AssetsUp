import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Borrowing, BorrowStatus } from './borrowing.entity';
import { CheckOutDto } from './dto/check-out.dto';
import { CheckInDto } from './dto/check-in.dto';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Asset } from '../assets/asset.entity';
import { AssetStatus } from '../assets/enums';
import { User } from '../users/user.entity';

@Injectable()
export class BorrowingService {
  constructor(
    @InjectRepository(Borrowing)
    private readonly repo: Repository<Borrowing>,
    @InjectRepository(Asset)
    private readonly assetsRepo: Repository<Asset>,
  ) {}

  async checkOut(dto: CheckOutDto, user: User): Promise<Borrowing> {
    const asset = await this.assetsRepo.findOne({ where: { id: dto.assetId } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.status === AssetStatus.ASSIGNED) {
      throw new BadRequestException('Asset is already checked out');
    }

    const borrowing = this.repo.create({
      assetId: dto.assetId,
      asset,
      borrowedBy: user,
      approvedBy: null,
      dueDate: new Date(dto.dueDate),
      notes: dto.notes ?? null,
      status: BorrowStatus.BORROWED,
    });

    await this.assetsRepo.update(asset.id, { status: AssetStatus.ASSIGNED, assignedTo: user });
    return this.repo.save(borrowing);
  }

  async checkIn(id: string, dto: CheckInDto, user: User): Promise<Borrowing> {
    const borrowing = await this.repo.findOne({ where: { id }, relations: ['asset'] });
    if (!borrowing) throw new NotFoundException('Borrowing record not found');
    if (borrowing.status === BorrowStatus.RETURNED) {
      throw new BadRequestException('Asset already returned');
    }

    borrowing.status = BorrowStatus.RETURNED;
    borrowing.returnedAt = new Date();
    if (dto.notes) borrowing.notes = dto.notes;
    borrowing.approvedBy = user;

    await this.assetsRepo.update(borrowing.assetId, { status: AssetStatus.ACTIVE, assignedTo: null });
    return this.repo.save(borrowing);
  }

  async findAll(query: PaginationQueryDto): Promise<PaginatedResponse<Borrowing>> {
    const { page = 1, limit = 20 } = query;
    const [data, total] = await this.repo.findAndCount({
      order: { checkedOutAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return PaginatedResponse.of(data, total, page, limit);
  }

  async findOne(id: string): Promise<Borrowing> {
    const b = await this.repo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Borrowing record not found');
    return b;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async markOverdue(): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Borrowing)
      .set({ status: BorrowStatus.OVERDUE })
      .where('status = :status AND dueDate < :now', { status: BorrowStatus.BORROWED, now: new Date() })
      .execute();
  }
}
