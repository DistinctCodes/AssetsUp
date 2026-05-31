import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { LocationsModule } from './locations/locations.module';

@Module({
  imports: [UsersModule, LocationsModule],
  exports: [UsersModule, LocationsModule],
})
export class OpsceModule {}
