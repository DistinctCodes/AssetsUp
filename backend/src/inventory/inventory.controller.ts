import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('inventory')
@ApiBearerAuth('JWT-auth')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all inventory items' })
  @ApiResponse({ status: 200, description: 'List of inventory items' })
  findAll() {
    return this.inventoryService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create an inventory item' })
  @ApiResponse({ status: 201, description: 'Inventory item created' })
  create(@Body() dto: any) {
    return this.inventoryService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get item details' })
  @ApiResponse({ status: 200, description: 'Item details' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  findOne(@Param('id') id: string) {
    return this.inventoryService.findById(id);
  }

  @Post(':id/movements')
  @ApiOperation({ summary: 'Record stock movement' })
  @ApiResponse({ status: 201, description: 'Movement recorded' })
  recordMovement(
    @Param('id') id: string,
    @Body()
    body: {
      type: 'IN' | 'OUT' | 'ADJUSTMENT';
      quantity: number;
      reason?: string;
    },
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'usr-1';
    return this.inventoryService.recordMovement(
      id,
      body.type,
      body.quantity,
      body.reason,
      userId,
    );
  }
}
