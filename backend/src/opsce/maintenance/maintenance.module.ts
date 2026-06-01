import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceRecord } from './entities/maintenance-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MaintenanceRecord])],
  exports: [TypeOrmModule],
})
export class MaintenanceModule {}