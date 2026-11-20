import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { BranchesModule } from './branches/branches.module';
import { DepartmentsModule } from './departments/departments.module';
import { LocationsModule } from './locations/locations.module';
import { CategoriesModule } from './categories/categories.module';
import { AssetsLifecycleModule } from './assets/assets-lifecycle.module';
import { AssetsModule } from './assets/assets.module';
import { NotesDocsController } from './assets/notes-docs.controller';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { TransfersModule } from './transfers/transfers.module';
import { InventoryModule } from './inventory/inventory.module';
import { VendorsModule } from './vendors/vendors.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { LicensesModule } from './licenses/licenses.module';
import { AuditsModule } from './audits/audits.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GatewayModule } from './gateway/gateway.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { StellarModule } from './stellar/stellar.module';
import { DepreciationModule } from './depreciation/depreciation.module';
import { ReservationsModule } from './reservations/reservations.module';
import { ReportsModule } from './reports/reports.module';
import { SearchModule } from './search/search.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { ImportModule } from './import/import.module';
import { MailModule } from './mail/mail.module';
import { QueueModule } from './queue/queue.module';
import { AlertsModule } from './alerts/alerts.module';
import { StorageModule } from './storage/storage.module';
import { RedisCacheModule } from './cache/redis-cache.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    CommonModule,
    UsersModule,
    HealthModule,
    AuthModule,
    BranchesModule,
    DepartmentsModule,
    LocationsModule,
    CategoriesModule,
    AssetsLifecycleModule,
    AssetsModule,
    MaintenanceModule,
    TransfersModule,
    InventoryModule,
    VendorsModule,
    PurchaseOrdersModule,
    LicensesModule,
    AuditsModule,
    NotificationsModule,
    GatewayModule,
    AuditLogsModule,
    StellarModule,
    DepreciationModule,
    ReservationsModule,
    // Feature modules that exist under src/ and must be mounted: without them
    // /reports and /search return 404 and the mail queue processor, expiry-alert
    // cron, webhook delivery and API-key guard never run. Queue and cache need
    // Redis (REDIS_HOST / REDIS_PORT). app.module.wiring.spec.ts fails if a
    // module or controller is left unwired again.
    ReportsModule,
    SearchModule,
    WebhooksModule,
    ApiKeysModule,
    ImportModule,
    MailModule,
    QueueModule,
    AlertsModule,
    StorageModule,
    RedisCacheModule,
    // Rate limiting. Configure with THROTTLE_TTL (ms) and THROTTLE_LIMIT.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: Number(config.get('THROTTLE_TTL', 60000)),
          limit: Number(config.get('THROTTLE_LIMIT', 100)),
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'password'),
        database: configService.get('DB_DATABASE', 'manage_assets'),
        autoLoadEntities: true,
        synchronize: false,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController, NotesDocsController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
