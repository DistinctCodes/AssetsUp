import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dtos/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dtos/update-purchase-order.dto';
import { PurchaseOrderQueryDto } from './dtos/purchase-order-query.dto';

@Controller('purchase-orders')
@UseGuards(AuthGuard('jwt'))
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  async create(@Body() dto: CreatePurchaseOrderDto, @Req() req: any) {
    return this.purchaseOrdersService.create(dto, req.user?.id);
  }

  @Get()
  async findAll(@Query() query: PurchaseOrderQueryDto) {
    return this.purchaseOrdersService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.purchaseOrdersService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @Req() req: any,
  ) {
    return this.purchaseOrdersService.update(id, dto, req.user?.id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Req() req: any,
  ) {
    return this.purchaseOrdersService.update(
      id,
      { status } as UpdatePurchaseOrderDto,
      req.user?.id,
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.purchaseOrdersService.remove(id);
    return { message: 'Purchase order deleted successfully' };
  }
}
