import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, Between } from 'typeorm';
import { CreateVendorContractDto } from './dto/create-vendor-contract.dto';
import { UpdateVendorContractDto } from './dto/update-vendor-contract.dto';
import { addDays, parseISO } from 'date-fns';
import { VendorContract } from './entities/vendor-contract.entity';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class VendorContractsService {
  private readonly logger = new Logger(VendorContractsService.name);

  constructor(
    @InjectRepository(VendorContract)
    private readonly repo: Repository<VendorContract>,
    private readonly notifier: NotificationsService, // inject your concrete implementation
  ) {}

  async create(dto: CreateVendorContractDto) {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async findAll(
    query: {
      supplierId?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { supplierId, search, page = 1, limit = 20 } = query;
    const qb = this.repo.createQueryBuilder('c');

    if (supplierId) qb.andWhere('c.supplierId = :supplierId', { supplierId });

    if (search)
      qb.andWhere('c.contractName ILIKE :search', { search: `%${search}%` });

    qb.orderBy('c.endDate', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Vendor contract not found');
    return item;
  }

  async update(id: string, dto: UpdateVendorContractDto) {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    await this.repo.remove(item);
    return { deleted: true };
  }

  /**
   * Find contracts that expire within `days` from today (inclusive).
   */
  async findExpiringWithin(days = 30) {
    const today = new Date();
    const end = addDays(today, days);
    // TypeORM date comparisons; use ISO dates
    const startIso = today.toISOString().slice(0, 10);
    const endIso = end.toISOString().slice(0, 10);

    return this.repo.find({
      where: {
        endDate: Between(startIso, endIso),
        isActive: true,
      },
      order: { endDate: 'ASC' },
    });
  }

  /**
   * Called by scheduled job to notify about near-expiry contracts.
   */
  async notifyExpiringContracts(days = 30) {
    const expiring = await this.findExpiringWithin(days);

    if (expiring.length === 0) {
      this.logger.debug(`No contracts expiring within ${days} days`);
      return;
    }

    for (const c of expiring) {
      // notifier could send an email, slack, push, etc.
      try {
        await this.notifier.notifyContractExpiring({
          contractId: c.id,
          supplierId: c.supplierId,
          contractName: c.contractName,
          endDate: c.endDate,
          daysUntilExpiry: Math.ceil(
            (new Date(c.endDate).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        });
      } catch (err) {
        this.logger.error('Failed to notify for contract ' + c.id, err);
      }
    }
  }
}
