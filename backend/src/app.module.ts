import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AssetsExtendedModule } from './assets/assets-extended.module';
import { AssetsOpsModule } from './assets/assets-ops.module';
import { CheckinModule } from './checkin/checkin.module';
import { AssetsModule } from './assets/assets.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { CacheService } from './cache/cache.service';
import { InventoryModule } from './inventory/inventory.module';
import { VendorsModule } from './vendors/vendors.module';
import { DashboardModule } from './assets/dashboard.module';
import { ReportingModule } from './reporting/reporting.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { LocationsModule } from './locations/locations.module';
import { ContractsModule } from './contracts/contracts.module';
import { LicensesModule } from './licenses/licenses.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { TasksModule } from './tasks/tasks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { StellarModule } from './stellar/stellar.module';
import { NotificationModule } from './notifications/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: parseInt(configService.get<string>('DB_PORT', '5432'), 10),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'password'),
        database: configService.get<string>('DB_DATABASE', 'manage_assets'),
        autoLoadEntities: true,
        synchronize: configService.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST', 'localhost');
        const port = parseInt(
          configService.get<string>('REDIS_PORT', '6379'),
          10,
        );
        const ttl = parseInt(configService.get<string>('CACHE_TTL', '300'), 10);

        return {
          store: redisStore as any,
          host,
          port,
          ttl,
          retry_strategy: (options: any) => {
            if (options.error && options.error.code === 'ECONNREFUSED') {
              return new Error(
                'Redis connection refused. Operating with inline graceful fallback.',
              );
            }
            return Math.min(options.attempt * 100, 3000);
          },
        };
      },
    }),

    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
      ],
    }),

    AssetsExtendedModule,
    AssetsOpsModule,
    CheckinModule,
    AssetsModule,
    QueueModule,
    StorageModule,
    UsersModule,
    AuthModule,
    ReportingModule,
    ContractsModule,
    LicensesModule,
    PurchaseOrdersModule,
    TasksModule,
    LocationsModule,
    ActivityLogModule,
    InventoryModule,
    VendorsModule,
    DashboardModule,
    NotificationsModule,
    WebhooksModule,
    StellarModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    CacheService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [CacheService],
})
export class AppModule {}
