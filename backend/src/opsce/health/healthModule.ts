import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditService } from './audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  providers: [HealthService],
  exports: [HealthService, TypeOrmModule],
})
export class HealthModule {}
