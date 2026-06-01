import { Module } from '@nestjs/common';
import { AssetsModule } from './assets/assets.module';
import { DepartmentsModule } from './departments/departments.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { LocationsModule } from './locations/locations.module';
import { AuthModule } from './auth/auth.module';
import { StellarModule } from './stellar/stellar.module';

/**
 * OpsceModule
 *
 * Aggregates all operational sub-modules: users, locations, audit, and
 * departments. ConfigModule is already global (registered in AppModule), so
 * every sub-module can inject ConfigService without re-importing it here.
 */
@Module({
  imports: [AuthModule, AssetsModule, UsersModule, LocationsModule, AuditModule, DepartmentsModule],
  exports: [AuthModule, AssetsModule, UsersModule, LocationsModule, AuditModule, DepartmentsModule],
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