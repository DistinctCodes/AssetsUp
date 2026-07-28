import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrder, POStatus } from './entities/purchase-order.entity';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
  ) {}

  async findAll() {
    return this.poRepo.find();
  }

  async findById(id: string) {
    const po = await this.poRepo.findOne({ where: { id } });
    if (!po) throw new NotFoundException(`PO ${id} not found`);
    return po;
  }

  async create(dto: Partial<PurchaseOrder>) {
    const count = await this.poRepo.count();
    const poNumber = dto.poNumber || `PO-${String(count + 1).padStart(5, '0')}`;
    const po = this.poRepo.create({ ...dto, poNumber });
    return this.poRepo.save(po);
  }

  async receive(id: string) {
    const po = await this.findById(id);
    po.status = POStatus.RECEIVED;
    return this.poRepo.save(po);
  }
}
