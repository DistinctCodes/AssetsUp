import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AssetsModule } from './assets/assets.module';
import { DepartmentsModule } from './departments/departments.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { LocationsModule } from './locations/locations.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [UsersModule, LocationsModule, AuditModule, DepartmentsModule, AssetsModule],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
  exports: [UsersModule, LocationsModule, AuditModule, DepartmentsModule, AssetsModule],
})
export class OpsceModule {}
