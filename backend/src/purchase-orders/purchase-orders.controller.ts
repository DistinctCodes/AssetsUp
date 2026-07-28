import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';

@ApiTags('purchase-orders')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all purchase orders' })
  findAll() {
    return this.poService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a purchase order' })
  create(@Body() dto: any) {
    return this.poService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase order details' })
  findOne(@Param('id') id: string) {
    return this.poService.findById(id);
  }

  @Post(':id/receive')
  @ApiOperation({ summary: 'Receive purchase order line items' })
  receive(@Param('id') id: string) {
    return this.poService.receive(id);
  }
}
