import { Controller, Get, Post, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetHistory } from './entities/asset-history.entity';

@Controller('assets/audit')
@UseGuards(AuthGuard('jwt'))
export class AssetAuditController {
  constructor(
    @InjectRepository(AssetHistory)
    private readonly historyRepository: Repository<AssetHistory>,
  ) {}

  @Get(':id')
  async getAuditTrail(@Param('id') id: string, @Query() query: { page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const [data, total] = await this.historyRepository.findAndCount({
      where: { assetId: id },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  @Post(':id/revert')
  async revertAuditEntry(@Param('id') id: string, @Body() body: { historyId: string }) {
    const entry = await this.historyRepository.findOne({ where: { id: body.historyId } });
    if (!entry) {
      return { message: 'Audit entry not found' };
    }
    return { message: 'Audit entry reverted', entry };
  }
}
