import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AssetsModule } from './assets/assets.module';
import { DepartmentsModule } from './departments/departments.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { LocationsModule } from './locations/locations.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { StellarModule } from './stellar/stellar.module';

/**
 * OpsceModule
 *
 * Aggregates all operational sub-modules: users, locations, audit, and
 * departments. ConfigModule is already global (registered in AppModule), so
 * every sub-module can inject ConfigService without re-importing it here.
 */
@Module({
  imports: [UsersModule, LocationsModule, AuditModule, DepartmentsModule, AssetsModule],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
  exports: [UsersModule, LocationsModule, AuditModule, DepartmentsModule, AssetsModule],
  imports: [
    UsersModule,
    LocationsModule,
    AuditModule,
    DepartmentsModule,
    AssetsModule,
    StellarModule,
  ],
  exports: [
    AuthModule,
    UsersModule,
    LocationsModule,
    AuditModule,
    DepartmentsModule,
    AssetsModule,
    StellarModule,
  ],
})
export class OpsceModule {}