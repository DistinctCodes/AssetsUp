import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { AuditLogFiltersDto } from './dto/audit-log-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../users/user.entity';

@ApiTags('audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get audit log entries' })
  @ApiResponse({ status: 200, description: 'Returns paginated audit logs' })
  async findAll(@Query() filters: AuditLogFiltersDto) {
    return this.auditLogService.findAll(filters);
  }
}
