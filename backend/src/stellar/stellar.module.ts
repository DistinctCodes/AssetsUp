import { Module, Global } from '@nestjs/common';
import { SorobanService } from './soroban.service';

@Global()
@Module({
  providers: [SorobanService],
  exports: [SorobanService],
})
export class StellarModule {}
