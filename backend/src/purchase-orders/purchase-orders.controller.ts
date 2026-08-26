import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
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

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft purchase order' })
  @ApiResponse({ status: 200, description: 'Purchase order updated' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.poService.update(id, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit a draft purchase order for approval' })
  @ApiResponse({ status: 200, description: 'Purchase order submitted' })
  submit(@Param('id') id: string) {
    return this.poService.submit(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a submitted purchase order' })
  @ApiResponse({ status: 200, description: 'Purchase order approved' })
  approve(@Param('id') id: string, @Req() req: any) {
    const approverId = req.user?.id || 'usr-1';
    return this.poService.approve(id, approverId);
  }

  @Post(':id/receive')
  @ApiOperation({ summary: 'Receive purchase order line items' })
  @ApiResponse({ status: 200, description: 'Purchase order received' })
  receive(@Param('id') id: string) {
    return this.poService.receive(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a draft or submitted purchase order' })
  @ApiResponse({ status: 200, description: 'Purchase order cancelled' })
  cancel(@Param('id') id: string) {
    return this.poService.cancel(id);
  }
}
