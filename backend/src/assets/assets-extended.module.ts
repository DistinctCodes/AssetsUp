import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from './entities/asset.entity';
import { AssetHistory } from './entities/asset-history.entity';
import { AssetDocument } from './entities/asset-document.entity';
import { MaintenanceRecord } from './entities/maintenance-record.entity';
import { AssetsExtendedService } from './assets-extended.service';
import { AssetsExtendedController } from './assets-extended.controller';
import { AssetAuditController } from './asset-audit.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Asset,
      AssetHistory,
      AssetDocument,
      MaintenanceRecord,
    ]),
  ],
  controllers: [AssetsExtendedController, AssetAuditController],
  providers: [AssetsExtendedService],
  exports: [AssetsExtendedService],
})
export class AssetsExtendedModule {}
