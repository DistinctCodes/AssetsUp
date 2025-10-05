import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
// import { ApiKeysModule } from "./api-keys/api-keys.module";
// import { OrganizationUnitsModule } from "./organization-units/organization-units.module";
// import { ChangeLogModule } from "./change-log/change-log.module";
// import { BarcodeModule } from "./barcode/barcode.module";
// import { ComplianceModule } from "./compliance/compliance.module";
// import { MobileDevicesModule } from "./mobile-devices/mobile-devices.module";
// import { PolicyDocumentsModule } from "./policy-documents/policy-documents.module";
// import { DeviceHealthModule } from "./device-health/device-health.module";
// import { QRCodeModule } from "./QR-Code/qrcode.module";
// import { NotificationsModule } from "./notifications/notifications.module";
// import { StatusHistoryModule } from "./status-history/status-history.module";
// import { DisposalRegistryModule } from "./disposal-registry/disposal-registry.module";
// import { VendorDirectoryModule } from "./vendor-directory/vendor-directory.module";
import { WebhooksModule } from './webhooks/webhooks.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuditLoggingInterceptor } from './audit-logs/audit-logging.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AssetCategory } from './asset-categories/asset-category.entity';
import { Department } from './departments/department.entity';
import { User } from './users/entities/user.entity';
import { FileUpload } from './file-uploads/entities/file-upload.entity';
import { Asset } from './assets/entities/assest.entity';
import { Supplier } from './suppliers/entities/supplier.entity';
import { AssetCategoriesModule } from './asset-categories/asset-categories.module';
import { DepartmentsModule } from './departments/departments.module';
import { AssetTransfersModule } from './asset-transfers/asset-transfers.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
        entities: [
          AssetCategory,
          Department,
          User,
          FileUpload,
          Asset,
          Supplier,
        ],
        synchronize: configService.get('NODE_ENV') !== 'production', // Only for development
      }),
      inject: [ConfigService],
    }),

    AssetCategoriesModule,
    DepartmentsModule,
    AssetTransfersModule,
    UsersModule,
    SearchModule,
    AuthModule,
    // ApiKeysModule,
    // OrganizationUnitsModule,
    // ChangeLogModule,
    // BarcodeModule,
    // ComplianceModule,
    // MobileDevicesModule,
    // PolicyDocumentsModule,
    // DeviceHealthModule,
    // QRCodeModule,
    // NotificationsModule,
    // StatusHistoryModule,
    // DisposalRegistryModule,
    // VendorDirectoryModule,
    WebhooksModule,
    AuditLogsModule,
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
