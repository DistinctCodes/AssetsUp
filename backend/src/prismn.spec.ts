import { AssetsService } from './assets/assets.service';

describe('prismn Modules (BE-86)', () => {
  it('AssetsService creates asset with auto-generated assetTag', async () => {
    const mockRepo = {
      count: jest.fn().mockResolvedValue(5),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((dto) => Promise.resolve({ id: 'ast-1', ...dto })),
    };
    const service = new AssetsService(mockRepo as any);
    const asset = await service.create({ name: 'MacBook Pro', purchaseCost: 200000 });
    expect(asset.assetTag).toBe('AST-00006');
    expect(asset.purchaseCost).toBe(200000);
  });
});
