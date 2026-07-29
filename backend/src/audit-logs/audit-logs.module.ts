import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    CacheModule.register({ ttl: 30000, max: 100 }),
  ],
  controllers: [AuditLogsController],
  providers: [AuditLogsService],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
