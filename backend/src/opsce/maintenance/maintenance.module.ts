import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceRecord } from './entities/maintenance-record.entity';
import { MaintenanceService } from './maintenance.service';

@Module({
  imports: [TypeOrmModule.forFeature([MaintenanceRecord])],
  providers: [MaintenanceService],
  exports: [TypeOrmModule, MaintenanceService],
})
export class MaintenanceModule {}