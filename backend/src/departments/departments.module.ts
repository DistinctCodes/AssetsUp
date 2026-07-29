import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from './entities/department.entity';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Department]), AuditLogsModule],
  providers: [DepartmentsService],
  controllers: [DepartmentsController],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
