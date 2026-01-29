import { Test, TestingModule } from '@nestjs/testing';
import { TransfersService } from './transfers.service';

describe('TransfersService', () => {
  let service: TransfersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransfersService],
    }).compile();

    service = module.get<TransfersService>(TransfersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
