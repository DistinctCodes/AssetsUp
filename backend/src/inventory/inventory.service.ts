import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from './entities/inventory.entity';
import { CreateInventoryDto } from './dtos/create-inventory.dto';
import { UpdateInventoryDto } from './dtos/update-inventory.dto';
import { InventoryQueryDto } from './dtos/inventory-query.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
  ) {}

  async create(dto: CreateInventoryDto): Promise<Inventory> {
    const totalValue = dto.quantity && dto.unitPrice ? dto.quantity * dto.unitPrice : 0;
    const item = this.inventoryRepository.create({ ...dto, totalValue });
    return this.inventoryRepository.save(item);
  }

  async findAll(query: InventoryQueryDto): Promise<{ data: Inventory[]; total: number }> {
    const { page = 1, limit = 20, categoryId, location, search, lowStock } = query;
    const qb = this.inventoryRepository.createQueryBuilder('item')
      .leftJoinAndSelect('item.asset', 'asset')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('item.createdAt', 'DESC');

    if (categoryId) qb.andWhere('item.categoryId = :categoryId', { categoryId });
    if (location) qb.andWhere('item.location ILIKE :location', { location: `%${location}%` });
    if (search) {
      qb.andWhere(
        '(item.notes ILIKE :search OR item.location ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (lowStock) {
      qb.andWhere('item.quantity <= item.reorderLevel');
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findById(id: string): Promise<Inventory> {
    const item = await this.inventoryRepository.findOne({
      where: { id },
      relations: ['asset'],
    });
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }

  async update(id: string, dto: UpdateInventoryDto): Promise<Inventory> {
    const item = await this.findById(id);
    Object.assign(item, dto);
    if (dto.quantity !== undefined || dto.unitPrice !== undefined) {
      item.totalValue = (dto.quantity ?? item.quantity) * (dto.unitPrice ?? item.unitPrice);
    }
    return this.inventoryRepository.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findById(id);
    await this.inventoryRepository.softDelete(item.id);
  }
}
