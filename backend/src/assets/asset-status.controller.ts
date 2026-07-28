import { Controller, Get, Patch, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AssetLifecycleService, AssetStatus } from './asset-lifecycle.service';

@ApiTags('assets')
@Controller('assets')
export class AssetStatusController {
  constructor(private readonly lifecycleService: AssetLifecycleService) {}

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update asset status' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { currentStatus: AssetStatus; newStatus: AssetStatus; note?: string },
    @Req() req: any,
  ) {
    this.lifecycleService.validateTransition(body.currentStatus, body.newStatus);
    const actorId = req.user?.id || 'usr-1';
    const entry = this.lifecycleService.recordHistory(id, {
      eventType: 'STATUS_CHANGED',
      actorUserId: actorId,
      note: body.note,
      fieldChanges: { status: { from: body.currentStatus, to: body.newStatus } },
    });
    return { assetId: id, status: body.newStatus, historyEntry: entry };
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get asset history and audit trail' })
  getHistory(@Param('id') id: string) {
    return this.lifecycleService.getHistory(id);
  }
}
