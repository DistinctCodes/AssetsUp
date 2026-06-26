import { Module, Global } from '@nestjs/common';
import { DepreciationService } from './depreciation.service';

@Global()
@Module({
  providers: [DepreciationService],
  exports: [DepreciationService],
})
export class DepreciationModule {}
