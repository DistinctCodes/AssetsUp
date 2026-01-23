import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Request,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import { DocumentService } from '../services/document.service';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentSearchDto,
  GrantAccessDto,
  DocumentBulkActionDto,
  UpdateAccessPermissionsDto,
} from '../dto/document.dto';

@ApiTags('Documents')
@Controller('documents')
@ApiBearerAuth()
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a new document' })
  @ApiConsumes('multipart/form-data')
  async uploadDocument(
    @Body() createDocumentDto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const userId = req.user?.id || 'unknown-user';
    return this.documentService.uploadDocument(createDocumentDto, file, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Search and list documents' })
  async listDocuments(@Query() searchDto: DocumentSearchDto, @Request() req: any) {
    const userId = req.user?.id || 'unknown-user';
    return this.documentService.listDocuments(searchDto, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document details' })
  async getDocument(@Param('id') documentId: string, @Request() req: any) {
    const userId = req.user?.id || 'unknown-user';
    return this.documentService.getDocument(documentId, userId);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Update document details and/or file' })
  @ApiConsumes('multipart/form-data')
  async updateDocument(
    @Param('id') documentId: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Request() req: any,
  ) {
    const userId = req.user?.id || 'unknown-user';
    return this.documentService.updateDocument(documentId, updateDocumentDto, file || null, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document' })
  async deleteDocument(@Param('id') documentId: string, @Request() req: any) {
    const userId = req.user?.id || 'unknown-user';
    await this.documentService.deleteDocument(documentId, userId);
  }

  @Put(':id/archive')
  @ApiOperation({ summary: 'Archive a document' })
  async archiveDocument(@Param('id') documentId: string, @Request() req: any) {
    const userId = req.user?.id || 'unknown-user';
    return this.documentService.archiveDocument(documentId, userId);
  }

  @Put(':id/unarchive')
  @ApiOperation({ summary: 'Unarchive a document' })
  async unarchiveDocument(@Param('id') documentId: string, @Request() req: any) {
    const userId = req.user?.id || 'unknown-user';
    return this.documentService.unarchiveDocument(documentId, userId);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get all versions of a document' })
  async getAllVersions(@Param('id') documentId: string, @Request() req: any) {
    const userId = req.user?.id || 'unknown-user';
    return this.documentService.getAllVersions(documentId, userId);
  }

  @Get(':id/versions/:version')
  @ApiOperation({ summary: 'Get specific document version' })
  async getVersion(
    @Param('id') documentId: string,
    @Param('version') version: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id || 'unknown-user';
    return this.documentService.getDocumentVersion(documentId, parseInt(version, 10), userId);
  }

  @Post(':id/versions/:version/restore')
  @ApiOperation({ summary: 'Restore document to a specific version' })
  async restoreVersion(
    @Param('id') documentId: string,
    @Param('version') version: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id || 'unknown-user';
    return this.documentService.restoreVersion(documentId, parseInt(version, 10), userId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download document file' })
  async downloadDocument(@Param('id') documentId: string, @Request() req: any, @Res() res: Response) {
    const userId = req.user?.id || 'unknown-user';
    const document = await this.documentService.getDocument(documentId, userId);

    if (!fs.existsSync(document.filePath)) {
      throw new BadRequestException('File not found on server');
    }

    res.download(document.filePath, document.fileName);
  }

  @Get(':id/versions/:version/download')
  @ApiOperation({ summary: 'Download specific document version' })
  async downloadVersion(
    @Param('id') documentId: string,
    @Param('version') version: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user?.id || 'unknown-user';
    const documentVersion = await this.documentService.getDocumentVersion(documentId, parseInt(version, 10), userId);

    if (!fs.existsSync(documentVersion.filePath)) {
      throw new BadRequestException('File not found on server');
    }

    res.download(documentVersion.filePath, documentVersion.fileName);
  }

  @Post(':id/permissions/grant')
  @ApiOperation({ summary: 'Grant access to a user' })
  async grantAccess(
    @Param('id') documentId: string,
    @Body() grantAccessDto: GrantAccessDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || 'unknown-user';
    return this.documentService.grantAccess(documentId, grantAccessDto, userId);
  }

  @Put(':id/permissions/:userId')
  @ApiOperation({ summary: 'Update user access permissions' })
  async updatePermissions(
    @Param('id') documentId: string,
    @Param('userId') userId: string,
    @Body() updateDto: UpdateAccessPermissionsDto,
    @Request() req: any,
  ) {
    const requestingUserId = req.user?.id || 'unknown-user';
    return this.documentService.updateAccessPermissions(documentId, userId, updateDto, requestingUserId);
  }

  @Delete(':id/permissions/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke user access' })
  async revokeAccess(
    @Param('id') documentId: string,
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    const requestingUserId = req.user?.id || 'unknown-user';
    await this.documentService.revokeAccess(documentId, userId, requestingUserId);
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: 'Get all permissions for a document' })
  async getPermissions(@Param('id') documentId: string, @Request() req: any) {
    const userId = req.user?.id || 'unknown-user';
    return this.documentService.getDocumentPermissions(documentId, userId);
  }

  @Post('bulk-action')
  @ApiOperation({ summary: 'Perform bulk action on documents' })
  async bulkAction(@Body() bulkActionDto: DocumentBulkActionDto, @Request() req: any) {
    const userId = req.user?.id || 'unknown-user';
    await this.documentService.bulkAction(bulkActionDto, userId);
    return { message: 'Bulk action completed successfully' };
  }

  @Get('asset/:assetId/documents')
  @ApiOperation({ summary: 'Get all documents for an asset' })
  async getAssetDocuments(@Param('assetId') assetId: string, @Request() req: any) {
    const userId = req.user?.id || 'unknown-user';
    return this.documentService.getDocumentsByAsset(assetId, userId);
  }
}
