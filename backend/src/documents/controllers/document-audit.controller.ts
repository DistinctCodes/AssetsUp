import { Controller, Get, Param, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentAuditService } from '../services/document-audit.service';
import { DocumentAuditActionType } from '../entities/document-audit-log.entity';

@ApiTags('Documents - Audit Logs')
@Controller('documents')
@ApiBearerAuth()
export class DocumentAuditController {
  constructor(private readonly auditService: DocumentAuditService) {}

  @Get(':id/audit-logs')
  @ApiOperation({ summary: 'Get audit logs for a document' })
  async getDocumentAuditLogs(
    @Param('id') documentId: string,
    @Query('limit') limit: string = '100',
    @Query('offset') offset: string = '0',
  ) {
    return this.auditService.getDocumentAuditLogs(
      documentId,
      parseInt(limit, 10),
      parseInt(offset, 10),
    );
  }

  @Get('audit-logs/user/:userId')
  @ApiOperation({ summary: 'Get audit logs by user' })
  async getUserAuditLogs(
    @Param('userId') userId: string,
    @Query('limit') limit: string = '100',
    @Query('offset') offset: string = '0',
  ) {
    return this.auditService.getUserAuditLogs(userId, parseInt(limit, 10), parseInt(offset, 10));
  }

  @Get('audit-logs/action/:actionType')
  @ApiOperation({ summary: 'Get audit logs by action type' })
  async getAuditLogsByActionType(
    @Param('actionType') actionType: DocumentAuditActionType,
    @Query('limit') limit: string = '100',
    @Query('offset') offset: string = '0',
  ) {
    return this.auditService.getAuditLogsByActionType(
      actionType,
      parseInt(limit, 10),
      parseInt(offset, 10),
    );
  }
}
