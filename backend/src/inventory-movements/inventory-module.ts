import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryMovement } from './entities/inventory-movement.entity';
import { InventoryMovementsService } from './inventory-movements.service';
import { InventoryMovementsController } from './inventory-movements.controller';
import { InventoryItem } from '../inventory-items/entities/inventory-item.entity'; // Assuming path

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryMovement, InventoryItem]),
  ],
  controllers: [InventoryMovementsController],
  providers: [InventoryMovementsService],
})
export class InventoryMovementsModule {}