import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import {
  PurchaseOrder,
  PurchaseOrderLineItem,
  POStatus,
} from './entities/purchase-order.entity';
import { PaginationQueryDto, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderLineItem)
    private readonly lineItemRepo: Repository<PurchaseOrderLineItem>,
  ) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResponse<PurchaseOrder>> {
    const { page = 1, limit = 20, search } = query;
    const where = search ? { poNumber: ILike(`%${search}%`) } : {};
    const [items, total] = await this.poRepo.findAndCount({
      where,
      relations: ['lineItems'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const po = await this.poRepo.findOne({
      where: { id },
      relations: ['lineItems'],
    });
    if (!po) throw new NotFoundException(`PO ${id} not found`);
    return po;
  }

  async create(dto: Partial<PurchaseOrder> & { lineItems?: Partial<PurchaseOrderLineItem>[] }) {
    const count = await this.poRepo.count();
    const poNumber = dto.poNumber || `PO-${String(count + 1).padStart(5, '0')}`;
    const { lineItems, ...poData } = dto;
    const po = this.poRepo.create({ ...poData, poNumber, status: POStatus.DRAFT });
    const saved = await this.poRepo.save(po);

    if (lineItems && lineItems.length > 0) {
      const items = lineItems.map((item) =>
        this.lineItemRepo.create({ ...item, purchaseOrderId: saved.id }),
      );
      await this.lineItemRepo.save(items);
      saved.totalAmount = items.reduce(
        (sum, item) => sum + item.quantity * item.unitCost,
        0,
      );
      await this.poRepo.save(saved);
    }

    return this.findById(saved.id);
  }

  async update(
    id: string,
    dto: Partial<PurchaseOrder> & { lineItems?: Partial<PurchaseOrderLineItem>[] },
  ) {
    const po = await this.findById(id);
    if (po.status !== POStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase orders can be edited');
    }

    const { lineItems, ...poData } = dto;
    Object.assign(po, poData);

    if (lineItems) {
      await this.lineItemRepo.delete({ purchaseOrderId: id });
      const items = lineItems.map((item) =>
        this.lineItemRepo.create({ ...item, purchaseOrderId: id }),
      );
      await this.lineItemRepo.save(items);
      po.totalAmount = items.reduce(
        (sum, item) => sum + item.quantity * item.unitCost,
        0,
      );
    }

    await this.poRepo.save(po);
    return this.findById(id);
  }

  async submit(id: string) {
    const po = await this.findById(id);
    if (po.status !== POStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase orders can be submitted');
    }
    po.status = POStatus.SUBMITTED;
    return this.poRepo.save(po);
  }

  async approve(id: string, approverUserId: string) {
    const po = await this.findById(id);
    if (po.status !== POStatus.SUBMITTED) {
      throw new BadRequestException(
        'Only submitted purchase orders can be approved',
      );
    }
    po.status = POStatus.APPROVED;
    po.createdByUserId = approverUserId;
    return this.poRepo.save(po);
  }

  async receive(id: string) {
    const po = await this.findById(id);
    if (po.status !== POStatus.APPROVED) {
      throw new BadRequestException(
        'Only approved purchase orders can be received',
      );
    }
    po.status = POStatus.RECEIVED;
    return this.poRepo.save(po);
  }

  async cancel(id: string) {
    const po = await this.findById(id);
    if (
      po.status !== POStatus.DRAFT &&
      po.status !== POStatus.SUBMITTED
    ) {
      throw new BadRequestException(
        'Only draft or submitted purchase orders can be cancelled',
      );
    }
    po.status = POStatus.CANCELLED;
    return this.poRepo.save(po);
  }
}
