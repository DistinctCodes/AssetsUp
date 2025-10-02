import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateStockDto } from './dto/update-inventory-item.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class InventoryItemsService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly itemRepository: Repository<InventoryItem>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createDto: CreateInventoryItemDto): Promise<InventoryItem> {
    const newItem = this.itemRepository.create(createDto);
    return this.itemRepository.save(newItem);
  }

  async findAll(): Promise<InventoryItem[]> {
    return this.itemRepository.find();
  }

  async findOne(id: string): Promise<InventoryItem> {
    const item = await this.itemRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Inventory item with ID "${id}" not found.`);
    }
    return item;
  }

  async updateStock(id: string, updateStockDto: UpdateStockDto): Promise<InventoryItem> {
    const item = await this.findOne(id);
    
    const newQuantity = item.quantity + updateStockDto.changeInQuantity;
    if (newQuantity < 0) {
      throw new NotFoundException('Stock quantity cannot be negative.');
    }
    item.quantity = newQuantity;

    const updatedItem = await this.itemRepository.save(item);

    // Emit an event to notify other modules (like the Alerts module)
    this.eventEmitter.emit('inventory.stock.changed', {
      itemId: updatedItem.id,
      change: updateStockDto.changeInQuantity,
    });

    return updatedItem;
  }
  
  async remove(id: string): Promise<{ deleted: boolean }> {
    const item = await this.findOne(id);
    await this.itemRepository.remove(item);
    return { deleted: true };
  }
}