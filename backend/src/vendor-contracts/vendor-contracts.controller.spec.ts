import { Test, TestingModule } from '@nestjs/testing';
import { VendorContractsController } from './vendor-contracts.controller';
import { VendorContractsService } from './vendor-contracts.service';

describe('VendorContractsController', () => {
  let controller: VendorContractsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorContractsController],
      providers: [VendorContractsService],
    }).compile();

    controller = module.get<VendorContractsController>(VendorContractsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
