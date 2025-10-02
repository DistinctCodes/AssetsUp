import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { InventoryMovementsService } from './inventory-movements.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { MovementType } from './entities/inventory-movement.entity';

@Controller('inventory-movements')
export class InventoryMovementsController {
  constructor(private readonly movementsService: InventoryMovementsService) {}

  @Post('stock-in')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  stockIn(@Body() createMovementDto: CreateMovementDto) {
    return this.movementsService.createMovement(createMovementDto, MovementType.IN);
  }

  @Post('stock-out')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  stockOut(@Body() createMovementDto: CreateMovementDto) {
    return this.movementsService.createMovement(createMovementDto, MovementType.OUT);
  }

  @Get('history/:itemId')
  getHistory(@Param('itemId') itemId: string) {
    return this.movementsService.findAllForItem(itemId);
  }
}