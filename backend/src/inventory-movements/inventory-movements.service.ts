import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { InventoryMovement, MovementType } from './entities/inventory-movement.entity';
import { InventoryItem } from '../inventory-items/entities/inventory-item.entity'; // Assuming path
import { CreateMovementDto } from './dto/create-movement.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class InventoryMovementsService {
  constructor(
    @InjectRepository(InventoryMovement)
    private readonly movementRepository: Repository<InventoryMovement>,
    private readonly entityManager: EntityManager,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createMovement(createDto: CreateMovementDto, type: MovementType): Promise<InventoryMovement> {
    // We run this entire operation in a transaction.
    // If any step fails, the whole operation is rolled back.
    return this.entityManager.transaction(async (transactionalEntityManager) => {
      const itemRepository = transactionalEntityManager.getRepository(InventoryItem);
      const movementRepository = transactionalEntityManager.getRepository(InventoryMovement);
      
      const item = await itemRepository.findOne({ where: { id: createDto.itemId } });
      if (!item) {
        throw new NotFoundException(`Inventory item with ID "${createDto.itemId}" not found.`);
      }

      let newQuantity: number;
      if (type === MovementType.IN) {
        newQuantity = item.quantity + createDto.quantity;
      } else { // type === MovementType.OUT
        if (item.quantity < createDto.quantity) {
          throw new BadRequestException(`Insufficient stock for item "${item.name}".`);
        }
        newQuantity = item.quantity - createDto.quantity;
      }
      
      // 1. Create the movement record
      const movement = movementRepository.create({ ...createDto, type });
      const savedMovement = await movementRepository.save(movement);

      // 2. Update the inventory item's quantity
      await itemRepository.update(createDto.itemId, { quantity: newQuantity });
      
      // 3. Emit an event for other modules (like alerts) to listen to
      this.eventEmitter.emit('inventory.stock.changed', {
        itemId: item.id,
        change: type === MovementType.IN ? createDto.quantity : -createDto.quantity,
      });

      return savedMovement;
    });
  }
  
  async findAllForItem(itemId: string): Promise<InventoryMovement[]> {
    return this.movementRepository.find({ where: { itemId }, order: { date: 'DESC' }});
  }
}