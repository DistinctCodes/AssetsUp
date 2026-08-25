import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('purchase-orders')
@ApiBearerAuth('JWT-auth')
@Controller('purchase-orders')
@UseGuards(JwtAuthGuard)
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all purchase orders' })
  @ApiResponse({ status: 200, description: 'List of purchase orders' })
  findAll() {
    return this.poService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a purchase order' })
  @ApiResponse({ status: 201, description: 'Purchase order created' })
  create(@Body() dto: any) {
    return this.poService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase order details' })
  @ApiResponse({ status: 200, description: 'Purchase order details' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  findOne(@Param('id') id: string) {
    return this.poService.findById(id);
  }

  @Post(':id/receive')
  @ApiOperation({ summary: 'Receive purchase order line items' })
  @ApiResponse({ status: 200, description: 'Purchase order received' })
  receive(@Param('id') id: string) {
    return this.poService.receive(id);
  }
}
