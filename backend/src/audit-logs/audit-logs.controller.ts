import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuditLogsService, AuditLogQuery } from './audit-logs.service';
import { AuditAction } from './entities/audit-log.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Audit Logs')
@ApiBearerAuth('JWT-auth')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @ApiOperation({
    summary: 'List audit logs (searchable, filterable, paginated) — ADMIN only',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of audit logs' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN role' })
  findAll(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('actorId') actorId?: string,
    @Query('action') action?: AuditAction,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const query: AuditLogQuery = {
      entityType,
      entityId,
      actorId,
      action,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    };
    return this.auditLogsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full detail of a single audit log entry' })
  @ApiResponse({ status: 200, description: 'Audit log detail' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  findOne(@Param('id') id: string) {
    return this.auditLogsService.findById(id);
  }
}
