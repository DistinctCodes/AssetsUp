import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AssetsModule } from '../assets/assets.module';
import { DepartmentsModule } from '../departments/departments.module';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { LocationsModule } from '../locations/locations.module';

/**
 * OpsceModule
 *
 * Aggregates all operational sub-modules: users, locations, audit, and
 * departments. ConfigModule is already global (registered in AppModule), so
 * every sub-module can inject ConfigService without re-importing it here.
 */
@Module({
  imports: [
    // ConfigModule is global — listed here for explicit documentation only.
    // Remove this import if it causes duplicate-module warnings in your version
    // of @nestjs/config.
    ConfigModule,

    UsersModule,
    LocationsModule,
    AuditModule,
    DepartmentsModule,
    AssetsModule,
  ],
  exports: [
    UsersModule,
    LocationsModule,
    AuditModule,
    DepartmentsModule,
    AssetsModule,
  ],
})
export class OpsceModule {}