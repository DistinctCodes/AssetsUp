// src/app.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { RolesGuard } from './auth/guards/roles.guard';
import { UserThrottlerGuard } from './auth/guards/user-throttler.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LocationsModule } from './locations/locations.module';
import { AssetsModule } from './assets/assets.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { CategoriesModule } from './categories/categories.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuditLogInterceptor } from './audit-log/audit-log.interceptor';
import { BorrowingModule } from './borrowing/borrowing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60000, limit: 10 },
      { name: 'per-user', ttl: 60000, limit: 60 },
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
        autoLoadEntities: true,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    DepartmentsModule,
    CategoriesModule,
    AssetsModule,
    ReportsModule,
    LocationsModule,
    AssetsModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    CategoriesModule,
    AuditLogModule,
    BorrowingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RolesGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
