import { Module } from '@nestjs/common';
import { AssetsModule } from './assets/assets.module';
import { DepartmentsModule } from './departments/departments.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { LocationsModule } from './locations/locations.module';

@Module({
  imports: [UsersModule, LocationsModule, AuditModule, DepartmentsModule],
  exports: [UsersModule, LocationsModule, AuditModule, DepartmentsModule],
})
export class OpsceModule {}
