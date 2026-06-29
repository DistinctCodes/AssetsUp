import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StellarService } from './stellar.service';
import { StellarDividendsController } from './stellar-dividends.controller';
import { StellarKycController } from './stellar-kyc.controller';

@Module({
  imports: [ConfigModule],
  controllers: [StellarDividendsController, StellarKycController],
  providers: [StellarService],
  exports: [StellarService],
})
export class StellarModule {}
