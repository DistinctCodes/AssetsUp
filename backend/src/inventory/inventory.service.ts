import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from './entities/inventory-item.entity';

@Injectable()
export class InventoryService {
  private movements = new Map<string, any[]>();

  constructor(
    @InjectRepository(InventoryItem)
    private readonly itemRepo: Repository<InventoryItem>,
  ) {}

  async findAll() {
    return this.itemRepo.find();
  }

  async findById(id: string) {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Inventory item ${id} not found`);
    return item;
  }

  async create(dto: Partial<InventoryItem>) {
    const item = this.itemRepo.create(dto);
    return this.itemRepo.save(item);
  }

  async recordMovement(itemId: string, type: 'IN' | 'OUT' | 'ADJUSTMENT', quantity: number, reason?: string, userId?: string) {
    const item = await this.findById(itemId);
    let newQty = item.quantityOnHand;

    if (type === 'IN') newQty += quantity;
    else if (type === 'OUT') newQty -= quantity;
    else if (type === 'ADJUSTMENT') newQty = quantity;

    if (newQty < 0) {
      throw new BadRequestException('Movement would result in negative stock');
    }

    item.quantityOnHand = newQty;
    await this.itemRepo.save(item);

    const mList = this.movements.get(itemId) || [];
    const mov = { id: `m_${Date.now()}`, itemId, type, quantity, reason, actorUserId: userId || 'usr-1', timestamp: new Date() };
    mList.unshift(mov);
    this.movements.set(itemId, mList);

    return { item, movement: mov };
  }
}
