import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { InventoryItemsService } from './inventory-items.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateStockDto } from './dto/update-inventory-item.dto';

@Controller('inventory-items')
export class InventoryItemsController {
  constructor(private readonly itemsService: InventoryItemsService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() createDto: CreateInventoryItemDto) {
    return this.itemsService.create(createDto);
  }

  @Get()
  findAll() {
    return this.itemsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.itemsService.findOne(id);
  }

  @Patch(':id/stock')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  updateStock(@Param('id') id: string, @Body() updateStockDto: UpdateStockDto) {
    return this.itemsService.updateStock(id, updateStockDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.itemsService.remove(id);
  }
}