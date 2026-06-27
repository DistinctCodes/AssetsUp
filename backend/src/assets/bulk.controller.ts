import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from './asset.entity';

@Controller('assets/bulk')
@UseGuards(AuthGuard('jwt'))
export class BulkController {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  @Post('delete')
  async bulkDelete(@Body() dto: { ids: string[] }) {
    const { ids } = dto;
    if (!ids || ids.length === 0) {
      return { message: 'No ids provided' };
    }
    await this.assetRepository.softDelete(ids);
    return { message: `${ids.length} assets deleted successfully` };
  }

  @Post('status')
  async bulkStatusUpdate(@Body() dto: { ids: string[]; status: string }) {
    const { ids, status } = dto;
    if (!ids || ids.length === 0) {
      return { message: 'No ids provided' };
    }
    await this.assetRepository.update(ids, { status });
    return { message: `${ids.length} assets updated successfully` };
  }

  @Post('transfer')
  async bulkTransfer(@Body() dto: { ids: string[]; assignedToId: string }) {
    const { ids, assignedToId } = dto;
    if (!ids || ids.length === 0) {
      return { message: 'No ids provided' };
    }
    await this.assetRepository.update(ids, { assignedToId });
    return { message: `${ids.length} assets transferred successfully` };
  }
}
