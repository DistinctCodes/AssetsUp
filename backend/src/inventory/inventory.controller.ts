import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all inventory items' })
  findAll() {
    return this.inventoryService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create an inventory item' })
  create(@Body() dto: any) {
    return this.inventoryService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get item details' })
  findOne(@Param('id') id: string) {
    return this.inventoryService.findById(id);
  }

  @Post(':id/movements')
  @ApiOperation({ summary: 'Record stock movement' })
  recordMovement(
    @Param('id') id: string,
    @Body() body: { type: 'IN' | 'OUT' | 'ADJUSTMENT'; quantity: number; reason?: string },
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'usr-1';
    return this.inventoryService.recordMovement(id, body.type, body.quantity, body.reason, userId);
  }
}
