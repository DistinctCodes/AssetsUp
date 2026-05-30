import { Module } from '@nestjs/common';
import { AssetsModule } from './assets/assets.module';
import { DepartmentsModule } from './departments/departments.module';

@Module({
  imports: [AssetsModule, DepartmentsModule],
  exports: [AssetsModule, DepartmentsModule],
})
export class OpsceModule {}
