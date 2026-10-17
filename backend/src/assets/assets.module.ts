import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { Asset } from './entities/asset.entity';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { AssetsLifecycleModule } from './assets-lifecycle.module';
import { AssetHistoryModule } from './asset-history.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { Department } from '../departments/entities/department.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    TypeOrmModule.forFeature([Asset, Department, User]),
    AssetsLifecycleModule,
    AssetHistoryModule,
    AuditLogsModule,
    ReservationsModule,
  ],
  providers: [AssetsService],
  controllers: [AssetsController],
  exports: [AssetsService],
})
export class AssetsModule {}
