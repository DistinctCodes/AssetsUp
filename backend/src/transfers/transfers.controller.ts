import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TransfersService } from './transfers.service';

@ApiTags('transfers')
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Get()
  @ApiOperation({ summary: 'List all asset transfers' })
  findAll() {
    return this.transfersService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Request an asset transfer' })
  create(@Body() dto: any) {
    return this.transfersService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transfer request details' })
  findOne(@Param('id') id: string) {
    return this.transfersService.findById(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve an asset transfer' })
  approve(@Param('id') id: string, @Req() req: any) {
    const approverId = req.user?.id || 'usr-1';
    return this.transfersService.approve(id, approverId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject an asset transfer' })
  reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.transfersService.reject(id, reason || 'Rejected by manager');
  }
}
