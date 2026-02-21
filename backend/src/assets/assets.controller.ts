import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetFiltersDto } from './dto/asset-filters.dto';
import { TransferAssetDto } from './dto/transfer-asset.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@ApiTags('Assets')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'List all assets with optional filters and pagination' })
  findAll(@Query() filters: AssetFiltersDto) {
    return this.service.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single asset by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Register a new asset' })
  create(@Body() dto: CreateAssetDto, @CurrentUser() user: User) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update asset details' })
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto, @CurrentUser() user: User) {
    return this.service.update(id, dto, user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update asset status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @CurrentUser() user: User) {
    return this.service.updateStatus(id, dto, user);
  }

  @Post(':id/transfer')
  @ApiOperation({ summary: 'Transfer asset to a different department or user' })
  transfer(@Param('id') id: string, @Body() dto: TransferAssetDto, @CurrentUser() user: User) {
    return this.service.transfer(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an asset' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get asset change history' })
  getHistory(@Param('id') id: string) {
    return this.service.getHistory(id);
  }

  // ── Notes ─────────────────────────────────────────────────────

  @Get(':id/notes')
  @ApiOperation({ summary: 'Get all notes for an asset' })
  getNotes(@Param('id') id: string) {
    return this.service.getNotes(id);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add a note to an asset' })
  createNote(@Param('id') id: string, @Body() dto: CreateNoteDto, @CurrentUser() user: User) {
    return this.service.createNote(id, dto, user);
  }

  @Delete(':id/notes/:noteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a note' })
  deleteNote(@Param('id') id: string, @Param('noteId') noteId: string) {
    return this.service.deleteNote(id, noteId);
  }

  // ── Maintenance ───────────────────────────────────────────────

  @Get(':id/maintenance')
  @ApiOperation({ summary: 'Get maintenance records for an asset' })
  getMaintenance(@Param('id') id: string) {
    return this.service.getMaintenance(id);
  }

  @Post(':id/maintenance')
  @ApiOperation({ summary: 'Create a maintenance record for an asset' })
  createMaintenance(@Param('id') id: string, @Body() dto: CreateMaintenanceDto, @CurrentUser() user: User) {
    return this.service.createMaintenance(id, dto, user);
  }

  @Patch(':id/maintenance/:maintenanceId')
  @ApiOperation({ summary: 'Update a maintenance record' })
  updateMaintenance(
    @Param('id') id: string,
    @Param('maintenanceId') maintenanceId: string,
    @Body() dto: UpdateMaintenanceDto,
  ) {
    return this.service.updateMaintenance(id, maintenanceId, dto);
  }

  // ── Documents ─────────────────────────────────────────────────

  @Get(':id/documents')
  @ApiOperation({ summary: 'Get documents attached to an asset' })
  getDocuments(@Param('id') id: string) {
    return this.service.getDocuments(id);
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Attach a document (URL) to an asset' })
  addDocument(@Param('id') id: string, @Body() dto: CreateDocumentDto, @CurrentUser() user: User) {
    return this.service.addDocument(id, dto, user);
  }

  @Delete(':id/documents/:documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a document from an asset' })
  deleteDocument(@Param('id') id: string, @Param('documentId') documentId: string) {
    return this.service.deleteDocument(id, documentId);
  }
}
