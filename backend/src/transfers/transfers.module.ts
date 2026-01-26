// src/transfers/transfer.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import * as redisStore from 'cache-manager-redis-store';

import { Transfer } from './entities/transfer.entity';
import { TransferApprovalRule } from './entities/transfer-approval-rule.entity';
import { Asset } from '../assets/entities/asset.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
// import { Location } from '../locations/entities/location.entity';
import { Role } from '../roles/entities/role.entity';

import { TransferController } from './controllers/transfers.controller';
import { TransferService } from './services/transfers.service';
import { ApprovalRuleService } from './services/approval-rule.service';
import { TransferLockService } from './services/transfer-lock.service';
import { ScheduledTransferService } from './services/scheduled-transfer.service';
import { ScheduledTransferProcessor } from './processors/scheduled-transfer.processor';

// import { AssetHistoryService } from '../assets/services/asset-history.service';
// import { NotificationService } from '../notifications/notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transfer,
      TransferApprovalRule,
      Asset,
      User,
      Department,
      Location,
      Role,
    ]),
    BullModule.registerQueue({
      name: 'scheduled-transfers',
    }),
    CacheModule.register({
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      ttl: 3600,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
  ],
  controllers: [TransferController],
  providers: [
    TransferService,
    ApprovalRuleService,
    TransferLockService,
    ScheduledTransferService,
    ScheduledTransferProcessor,
  ],
  exports: [TransferService, ApprovalRuleService],
})
export class TransferModule {}
