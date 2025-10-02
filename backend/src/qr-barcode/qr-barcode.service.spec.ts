import { Test, TestingModule } from '@nestjs/testing';
import { QrBarcodeService } from './qr-barcode.service';

describe('QrBarcodeService', () => {
  let service: QrBarcodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QrBarcodeService],
    }).compile();

    service = module.get<QrBarcodeService>(QrBarcodeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
