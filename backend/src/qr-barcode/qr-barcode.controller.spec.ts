import { Test, TestingModule } from '@nestjs/testing';
import { QrBarcodeController } from './qr-barcode.controller';
import { QrBarcodeService } from './qr-barcode.service';

describe('QrBarcodeController', () => {
  let controller: QrBarcodeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QrBarcodeController],
      providers: [QrBarcodeService],
    }).compile();

    controller = module.get<QrBarcodeController>(QrBarcodeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
