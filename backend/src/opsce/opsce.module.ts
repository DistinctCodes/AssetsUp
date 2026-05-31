import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { LocationsModule } from './locations/locations.module';

@Module({
  imports: [UsersModule, LocationsModule, AuditModule],
  exports: [UsersModule, LocationsModule, AuditModule],
})
export class OpsceModule {}
