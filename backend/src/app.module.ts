import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssetCategoriesModule } from './asset-categories/asset-categories.module';
import { SettingsModule } from './settings/settings.module';
import { AssetCategory } from './asset-categories/asset-category.entity';
import { DepartmentsModule } from './departments/departments.module';
import { Department } from './departments/department.entity';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { SearchModule } from './search/search.module';
import { AuthModule } from './auth/auth.module';
import { RiskModule } from './risk/risk.module';
import { ReportingModule } from './reporting/reporting.module';
import { AssetTransfersModule } from './asset-transfers/asset-transfers.module';
import { FileUpload } from './file-uploads/entities/file-upload.entity';
import { Asset } from './assets/entities/assest.entity';
import { Supplier } from './suppliers/entities/supplier.entity';
import { QrBarcodeModule } from './qr-barcode/qr-barcode.module';
import { VendorContractsModule } from './vendor-contracts/vendor-contracts.module';

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
    RiskModule,
    ReportingModule,
    QrBarcodeModule,
    VendorContractsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
