import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { CreatePurchaseOrderDto } from './dtos/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dtos/update-purchase-order.dto';
import { PurchaseOrderQueryDto } from './dtos/purchase-order-query.dto';

@Injectable()
export class PurchaseOrdersService {
  private nextNumber: number;

  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepository: Repository<PurchaseOrder>,
    private readonly configService: ConfigService,
  ) {
    this.nextNumber = parseInt(
      configService.get<string>('PO_ID_START', '1000'),
      10,
    );
  }

  async create(
    dto: CreatePurchaseOrderDto,
    userId?: string,
  ): Promise<PurchaseOrder> {
    const prefix = this.configService.get<string>('PO_ID_PREFIX', 'PO');
    const poNumber = `${prefix}-${this.nextNumber++}`;
    const items =
      dto.items?.map((item) => ({
        ...item,
        total: item.total ?? item.quantity * item.unitPrice,
      })) || [];
    const subtotal =
      dto.subtotal ?? items.reduce((sum, item) => sum + item.total, 0);
    const total = dto.total ?? subtotal + (dto.tax ?? 0);

    const po = this.poRepository.create({
      ...dto,
      items,
      poNumber,
      subtotal,
      total,
      createdById: userId,
    });
    return this.poRepository.save(po);
  }

  async findAll(
    query: PurchaseOrderQueryDto,
  ): Promise<{ data: PurchaseOrder[]; total: number }> {
    const { search, status, vendor, page, limit } = query;
    const qb = this.poRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.createdBy', 'createdBy')
      .leftJoinAndSelect('po.approvedBy', 'approvedBy');

    if (search) {
      qb.andWhere(
        '(po.vendor ILIKE :search OR po.poNumber ILIKE :search OR CAST(po.total AS TEXT) ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (status) qb.andWhere('po.status = :status', { status });
    if (vendor)
      qb.andWhere('po.vendor ILIKE :vendor', { vendor: `%${vendor}%` });

    qb.orderBy('po.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);
    return qb.getManyAndCount().then(([data, total]) => ({ data, total }));
  }

  async findById(id: string): Promise<PurchaseOrder> {
    const po = await this.poRepository.findOne({
      where: { id },
      relations: ['createdBy', 'approvedBy'],
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async update(
    id: string,
    dto: UpdatePurchaseOrderDto,
    _userId?: string,
  ): Promise<PurchaseOrder> {
    const po = await this.findById(id);
    if (dto.items) {
      dto.items = dto.items.map((item) => ({
        ...item,
        total: item.total ?? item.quantity * item.unitPrice,
      }));
    }
    Object.assign(po, dto);
    return this.poRepository.save(po);
  }

  async remove(id: string): Promise<void> {
    const po = await this.findById(id);
    await this.poRepository.softDelete(po.id);
  }
}
