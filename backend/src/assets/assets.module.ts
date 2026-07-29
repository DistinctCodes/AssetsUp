import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from './entities/asset.entity';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { AssetsLifecycleModule } from './assets-lifecycle.module';
import { AssetHistoryModule } from './asset-history.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { Department } from '../departments/entities/department.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Asset, Department, User]),
    AssetsLifecycleModule,
    AssetHistoryModule,
    AuditLogsModule,
  ],
  providers: [AssetsService],
  controllers: [AssetsController],
  exports: [AssetsService],
})
export class AssetsModule {}
