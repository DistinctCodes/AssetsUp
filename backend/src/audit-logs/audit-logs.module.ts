import { Module } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';

@Module({
  providers: [AuditLogsService],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
