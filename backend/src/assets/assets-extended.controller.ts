import { Controller, Post, Get, Patch, Delete, Param, Body, Query, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssetsExtendedService } from './assets-extended.service';
import { TransferAssetDto } from './dtos/transfer-asset.dto';
import { CreateMaintenanceDto } from './dtos/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dtos/update-maintenance.dto';
import { HistoryQueryDto } from './dtos/history-query.dto';

@Controller('assets')
@UseGuards(AuthGuard('jwt'))
export class AssetsExtendedController {
  constructor(private readonly assetsExtendedService: AssetsExtendedService) {}

  @Post(':id/transfer')
  async transfer(@Param('id') id: string, @Body() dto: TransferAssetDto, @Req() req: any) {
    return this.assetsExtendedService.transfer(id, dto, req.user?.id);
  }

  @Get(':id/history')
  async getHistory(@Param('id') id: string, @Query() query: HistoryQueryDto) {
    return this.assetsExtendedService.getHistory(id, query);
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Req() req: any) {
    return this.assetsExtendedService.addDocument(id, file, req.user?.id);
  }

  @Get(':id/documents')
  async listDocuments(@Param('id') id: string) {
    return this.assetsExtendedService.listDocuments(id);
  }

  @Delete(':id/documents/:documentId')
  async deleteDocument(@Param('id') id: string, @Param('documentId') documentId: string) {
    await this.assetsExtendedService.deleteDocument(id, documentId);
    return { message: 'Document deleted' };
  }

  @Post(':id/maintenance')
  async createMaintenance(@Param('id') id: string, @Body() dto: CreateMaintenanceDto, @Req() req: any) {
    return this.assetsExtendedService.createMaintenance(id, dto, req.user?.id);
  }

  @Get(':id/maintenance')
  async getMaintenanceRecords(@Param('id') id: string) {
    return this.assetsExtendedService.getMaintenanceRecords(id);
  }

  @Patch(':id/maintenance/:recordId')
  async updateMaintenance(@Param('id') id: string, @Param('recordId') recordId: string, @Body() dto: UpdateMaintenanceDto) {
    return this.assetsExtendedService.updateMaintenance(id, recordId, dto);
  }
}
