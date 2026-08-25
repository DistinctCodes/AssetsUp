import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import { POStatus } from '../purchase-orders/entities/purchase-order.entity';
import { PurchaseOrder } from '../purchase-orders/entities/purchase-order.entity';

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
  ) {}

  async findAll() {
    return this.vendorRepo.find();
  }

  async findById(id: string) {
    const vendor = await this.vendorRepo.findOne({ where: { id } });
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return vendor;
  }

  async create(dto: Partial<Vendor>) {
    const vendor = this.vendorRepo.create(dto);
    return this.vendorRepo.save(vendor);
  }

  async update(id: string, dto: Partial<Vendor>) {
    const vendor = await this.findById(id);
    Object.assign(vendor, dto);
    return this.vendorRepo.save(vendor);
  }

  async delete(id: string) {
    await this.findById(id);

    const openPo = await this.poRepo.findOne({
      where: {
        vendorId: id,
        status: Not(POStatus.RECEIVED),
      },
    });

    if (openPo) {
      throw new BadRequestException(
        `Cannot delete vendor ${id}: it is referenced by open purchase order ${openPo.poNumber}`,
      );
    }

    await this.vendorRepo.delete(id);
  }
}