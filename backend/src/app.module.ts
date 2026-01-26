// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './users/user.module';
import { AuthModule } from './auth/auth.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuditLoggingInterceptor } from './audit-logs/audit-logging.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AssetCategory } from './asset-categories/asset-category.entity';
import { Department } from './departments/entities/department.entity';
import { User } from './users/entities/user.entity';
import { FileUpload } from './file-uploads/entities/file-upload.entity';
import { Asset } from './assets/entities/asset.entity';
import { Supplier } from './suppliers/entities/supplier.entity';
import { AssetCategoriesModule } from './asset-categories/asset-categories.module';
import { AssetsModule } from './assets/assets.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ReportsModule } from './reports/reports.module';

// Import Report entities
import { Report } from './reports/entities/report.entity';
import { ScheduledReport } from './reports/entities/scheduled-report.entity';
import { ReportExecution } from './reports/entities/report-execution.entity';

// Import Document entities (referenced in your original app.module)
// Make sure these exist or remove if not needed
// import { Document } from './documents/entities/document.entity';
// import { DocumentVersion } from './documents/entities/document-version.entity';
// import { DocumentAccessPermission } from './documents/entities/document-access-permission.entity';
// import { DocumentAuditLog } from './documents/entities/document-audit-log.entity';
import { TransfersModule } from './transfers/transfers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'password'),
        database: configService.get('DB_DATABASE', 'manage_assets'),
        entities: [
          AssetCategory,
          Department,
          User,
          FileUpload,
          Asset,
          Supplier,
          Report,
          ScheduledReport,
          ReportExecution,
          // Document,
          // DocumentVersion,
          // DocumentAccessPermission,
          // DocumentAuditLog,
        ],
        synchronize: configService.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),

    AssetCategoriesModule,
    UserModule,
    AuthModule,
    WebhooksModule,
    AuditLogsModule,
    AssetsModule,
    AnalyticsModule,
    ReportsModule,
    TransfersModule, // Add the Reports Module
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLoggingInterceptor,
    },
    AppService,
  ],
})
export class AppModule {}
