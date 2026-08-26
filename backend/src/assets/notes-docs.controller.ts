import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
