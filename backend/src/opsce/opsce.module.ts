import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [AuditModule],
  exports: [AuditModule],
})
export class OpsceModule {}
