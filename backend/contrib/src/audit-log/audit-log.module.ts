import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), UsersModule],
  controllers: [AuditLogController],
  providers: [AuditLogService, RolesGuard],
  exports: [AuditLogService],
})
export class AuditLogModule {}
