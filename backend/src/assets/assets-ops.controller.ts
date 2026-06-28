import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AssetsOpsService } from './assets-ops.service';
import { CreateNoteDto } from './dtos/create-note.dto';
import { BulkStatusDto } from './dtos/bulk-status.dto';
import { BulkDeleteDto } from './dtos/bulk-delete.dto';
import { BulkTransferDto } from './dtos/bulk-transfer.dto';

@Controller('assets')
@UseGuards(AuthGuard('jwt'))
export class AssetsOpsController {
  constructor(private readonly assetsOpsService: AssetsOpsService) {}

  @Post(':id/notes')
  async createNote(
    @Param('id') id: string,
    @Body() dto: CreateNoteDto,
    @Req() req: any,
  ) {
    return this.assetsOpsService.createNote(id, dto, req.user?.id);
  }

  @Get(':id/notes')
  async getNotes(@Param('id') id: string) {
    return this.assetsOpsService.getNotes(id);
  }

  @Delete(':id/notes/:noteId')
  async deleteNote(@Param('id') id: string, @Param('noteId') noteId: string) {
    await this.assetsOpsService.deleteNote(id, noteId);
    return { message: 'Note deleted' };
  }

  @Post(':id/qrcode')
  async generateQRCode(@Param('id') id: string) {
    const qrCode = await this.assetsOpsService.generateQRCode(id);
    return { qrCode };
  }

  @Post(':id/barcode')
  async generateBarcode(@Param('id') id: string) {
    const barcode = await this.assetsOpsService.generateBarcode(id);
    return { barcode };
  }

  @Post('bulk/status')
  async bulkStatusUpdate(@Body() dto: BulkStatusDto, @Req() req: any) {
    const count = await this.assetsOpsService.bulkStatusUpdate(
      dto,
      req.user?.id,
    );
    return { updated: count };
  }

  @Post('bulk/delete')
  async bulkDelete(@Body() dto: BulkDeleteDto) {
    const count = await this.assetsOpsService.bulkDelete(dto);
    return { deleted: count };
  }

  @Post('bulk/transfer')
  async bulkTransfer(@Body() dto: BulkTransferDto, @Req() req: any) {
    const count = await this.assetsOpsService.bulkTransfer(dto, req.user?.id);
    return { transferred: count };
  }

  @Get('bulk/export')
  async bulkExport(@Query('ids') ids?: string) {
    const idArray = ids ? ids.split(',') : undefined;
    return this.assetsOpsService.bulkExport(idArray);
  }
}
