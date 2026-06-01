import { Module } from '@nestjs/common';
import { AssetsModule } from './assets/assets.module';
import { DepartmentsModule } from './departments/departments.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { LocationsModule } from './locations/locations.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [AuthModule, AssetsModule, UsersModule, LocationsModule, AuditModule, DepartmentsModule],
  exports: [AuthModule, AssetsModule, UsersModule, LocationsModule, AuditModule, DepartmentsModule],
})
export class OpsceModule {}
