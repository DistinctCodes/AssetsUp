import { Module } from '@nestjs/common';
import { AssetsModule } from './assets/assets.module';
import { DepartmentsModule } from './departments/departments.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { LocationsModule } from './locations/locations.module';
import { AuthModule } from './auth/auth.module';
import { UploadsModule } from './uploads/uploads.module';

/**
 * OpsceModule
 *
 * Aggregates all operational sub-modules: users, locations, audit, and
 * departments. ConfigModule is already global (registered in AppModule), so
 * every sub-module can inject ConfigService without re-importing it here.
 */
@Module({
  imports: [
    AuthModule,
    UsersModule,
    LocationsModule,
    AuditModule,
    DepartmentsModule,
    AssetsModule,
    UploadsModule,
  ],
  exports: [
    AuthModule,
    UsersModule,
    LocationsModule,
    AuditModule,
    DepartmentsModule,
    AssetsModule,
    UploadsModule,
  ],
})
export class OpsceModule {}