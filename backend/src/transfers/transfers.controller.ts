import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { TransfersService } from './transfers.service';

@ApiTags('transfers')
@ApiBearerAuth('JWT-auth')
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Get()
  @ApiOperation({ summary: 'List all asset transfers' })
  @ApiResponse({ status: 200, description: 'List of transfers' })
  findAll() {
    return this.transfersService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Request an asset transfer' })
  @ApiResponse({ status: 201, description: 'Transfer request created' })
  create(@Body() dto: any) {
    return this.transfersService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transfer request details' })
  @ApiResponse({ status: 200, description: 'Transfer details' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  findOne(@Param('id') id: string) {
    return this.transfersService.findById(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve an asset transfer' })
  @ApiResponse({ status: 200, description: 'Transfer approved' })
  approve(@Param('id') id: string, @Req() req: any) {
    const approverId = req.user?.id || 'usr-1';
    return this.transfersService.approve(id, approverId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject an asset transfer' })
  @ApiResponse({ status: 200, description: 'Transfer rejected' })
  reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.transfersService.reject(id, reason || 'Rejected by manager');
  }
}
