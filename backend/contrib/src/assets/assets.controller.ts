import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { DuplicateAssetDto } from './dto/duplicate-asset.dto';
import { AssetFiltersDto } from './dto/asset-filters.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { TransferAssetDto } from './dto/transfer-asset.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new asset' })
  @ApiResponse({ status: 201, description: 'Asset created' })
  async create(
    @Body() dto: CreateAssetDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.assetsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List assets with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated assets' })
  async findAll(@Query() filters: AssetFiltersDto) {
    return this.assetsService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single asset by ID with all relations' })
  @ApiResponse({ status: 200, description: 'Returns the asset' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.findOne(id);
  }

  @Get(':id/depreciation')
  @ApiOperation({ summary: 'Get asset depreciation calculation' })
  @ApiResponse({ status: 200, description: 'Returns depreciation details' })
  @ApiResponse({ status: 404, description: 'Asset not found or missing data' })
  async getDepreciation(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.getDepreciation(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update an asset' })
  @ApiResponse({ status: 200, description: 'Asset updated' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.assetsService.update(id, dto, userId);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate an asset' })
  @ApiResponse({ status: 201, description: 'Asset duplicated' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DuplicateAssetDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.assetsService.duplicate(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete an asset' })
  @ApiResponse({ status: 204, description: 'Asset soft deleted' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.assetsService.softDelete(id, userId);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import assets from CSV' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Import results' })
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    return this.assetsService.importCsv(file.buffer, userId);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted asset' })
  @ApiResponse({ status: 200, description: 'Asset restored' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.assetsService.restore(id, userId);
  }

  // ── BE-25: Status update & transfer ─────────────────────────────────────────

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update asset status' })
  @ApiResponse({ status: 200, description: 'Asset status updated' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.assetsService.updateStatus(id, dto, userId);
  }

  @Post(':id/transfer')
  @ApiOperation({ summary: 'Transfer asset to another department' })
  @ApiResponse({ status: 200, description: 'Asset transferred' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({ status: 400, description: 'Department or user not found' })
  async transfer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferAssetDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.assetsService.transfer(id, dto, userId);
  }

  // ── BE-26: History & notes ───────────────────────────────────────────────────

  @Get(':id/history')
  @ApiOperation({ summary: 'Get asset history ordered by createdAt DESC' })
  @ApiResponse({ status: 200, description: 'Returns asset history' })
  async getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.getHistory(id);
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'Get all notes for an asset' })
  @ApiResponse({ status: 200, description: 'Returns notes' })
  async getNotes(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.getNotes(id);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add a note to an asset' })
  @ApiResponse({ status: 201, description: 'Note created' })
  async createNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.assetsService.createNote(id, dto, userId);
  }

  @Delete(':id/notes/:noteId')
  @ApiOperation({ summary: 'Delete a note' })
  @ApiResponse({ status: 204, description: 'Note deleted' })
  async deleteNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ) {
    await this.assetsService.deleteNote(id, noteId);
  }

  // ── BE-27: Maintenance & documents ──────────────────────────────────────────

  @Get(':id/maintenance')
  @ApiOperation({ summary: 'Get all maintenance records for an asset' })
  @ApiResponse({ status: 200, description: 'Returns maintenance records' })
  async getMaintenance(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.getMaintenance(id);
  }

  @Post(':id/maintenance')
  @ApiOperation({ summary: 'Create a maintenance record for an asset' })
  @ApiResponse({ status: 201, description: 'Maintenance record created' })
  async createMaintenance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMaintenanceDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.assetsService.createMaintenance(id, dto, userId);
  }

  @Patch(':id/maintenance/:maintenanceId')
  @ApiOperation({ summary: 'Update a maintenance record' })
  @ApiResponse({ status: 200, description: 'Maintenance record updated' })
  async updateMaintenance(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('maintenanceId', ParseUUIDPipe) maintenanceId: string,
    @Body() dto: UpdateMaintenanceDto,
  ) {
    return this.assetsService.updateMaintenance(id, maintenanceId, dto);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Get all documents for an asset' })
  @ApiResponse({ status: 200, description: 'Returns documents' })
  async getDocuments(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.getDocuments(id);
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Upload a document entry for an asset' })
  @ApiResponse({ status: 201, description: 'Document created' })
  async createDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDocumentDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.assetsService.createDocument(id, dto, userId);
  }

  @Delete(':id/documents/:documentId')
  @ApiOperation({ summary: 'Delete a document from an asset' })
  @ApiResponse({ status: 204, description: 'Document deleted' })
  async deleteDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    await this.assetsService.deleteDocument(id, documentId);
  }

  // ── BE-28: QR & Barcode ──────────────────────────────────────────────────────

  @Get(':id/qrcode')
  @ApiOperation({ summary: 'Generate QR code PNG for asset' })
  @ApiResponse({ status: 200, description: 'Returns PNG image buffer' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async getQrCode(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.assetsService.generateQrCode(id);
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  }

  @Get(':id/barcode')
  @ApiOperation({ summary: 'Generate Code128 barcode PNG for asset' })
  @ApiResponse({ status: 200, description: 'Returns PNG image buffer' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async getBarcode(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.assetsService.generateBarcode(id);
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  }
}

