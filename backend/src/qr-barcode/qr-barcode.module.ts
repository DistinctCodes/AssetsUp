import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from 'src/assets/entities/assest.entity';
import { QrBarcodeController } from './qr-barcode.controller';
import { QrBarcodeService } from './qr-barcode.service';

@Module({
  imports: [TypeOrmModule.forFeature([Asset])],
  providers: [QrBarcodeService],
  controllers: [QrBarcodeController],
  exports: [QrBarcodeService],
})
export class QrBarcodeModule {}
