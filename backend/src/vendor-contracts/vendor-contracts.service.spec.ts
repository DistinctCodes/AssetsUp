import { Test, TestingModule } from '@nestjs/testing';
import { VendorContractsService } from './vendor-contracts.service';

describe('VendorContractsService', () => {
  let service: VendorContractsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VendorContractsService],
    }).compile();

    service = module.get<VendorContractsService>(VendorContractsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
