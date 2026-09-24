import { Controller, Get, Post, Param, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const ALLOWED_MIME_TYPES = new Set<string>([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

@ApiTags('assets')
@ApiBearerAuth('JWT-auth')
@Controller('assets/:id')
@UseGuards(JwtAuthGuard)
export class NotesDocsController {
  private notes = new Map<string, any[]>();
  private docs = new Map<string, any[]>();

  @Get('notes')
  @ApiOperation({ summary: 'Get asset notes' })
  @ApiResponse({ status: 200, description: 'List of notes' })
  getNotes(@Param('id') assetId: string) {
    return this.notes.get(assetId) || [];
  }

  @Post('notes')
  @ApiOperation({ summary: 'Add an asset note' })
  @ApiResponse({ status: 201, description: 'Note added' })
  addNote(
    @Param('id') assetId: string,
    @Body('content') content: string,
    @Req() req: any,
  ) {
    const list = this.notes.get(assetId) || [];
    const note = {
      id: `n_${Date.now()}`,
      assetId,
      content,
      authorUserId: req.user?.id || 'usr-1',
      createdAt: new Date(),
    };
    list.unshift(note);
    this.notes.set(assetId, list);
    return note;
  }

  @Get('documents')
  @ApiOperation({ summary: 'Get asset document attachments' })
  @ApiResponse({ status: 200, description: 'List of documents' })
  getDocuments(@Param('id') assetId: string) {
    return this.docs.get(assetId) || [];
  }

  @Post('documents')
  @ApiOperation({ summary: 'Attach a document to an asset' })
  @ApiResponse({ status: 201, description: 'Document attached' })
  addDocument(
    @Param('id') assetId: string,
    @Body()
    body: {
      title: string;
      fileUrl: string;
      fileType?: string;
      fileSizeBytes?: number;
    },
    @Req() req: any,
  ) {
    if (!body.title || !body.fileUrl) {
      throw new BadRequestException('title and fileUrl are required');
    }
    if (body.fileType && !ALLOWED_MIME_TYPES.has(body.fileType)) {
      throw new BadRequestException(
        `File type "${body.fileType}" is not allowed`,
      );
    }
    if (
      body.fileSizeBytes != null &&
      body.fileSizeBytes > MAX_FILE_SIZE_BYTES
    ) {
      throw new BadRequestException('File exceeds the maximum allowed size of 10 MB');
    }

    const list = this.docs.get(assetId) || [];
    const doc = {
      id: `d_${Date.now()}`,
      assetId,
      ...body,
      uploadedByUserId: req.user?.id || 'usr-1',
      createdAt: new Date(),
    };
    list.unshift(doc);
    this.docs.set(assetId, list);
    return doc;
  }
}
