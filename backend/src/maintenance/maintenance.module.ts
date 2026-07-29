import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceRecord } from './entities/maintenance-record.entity';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';
import { AssetMaintenanceController } from './asset-maintenance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MaintenanceRecord])],
  providers: [MaintenanceService],
  controllers: [MaintenanceController, AssetMaintenanceController],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
