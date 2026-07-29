import { LocationsService } from './locations/locations.service';
import { CategoriesService } from './categories/categories.service';
import {
  AssetLifecycleService,
  AssetStatus,
} from './assets/asset-lifecycle.service';

describe('femaleotaku Modules (BE-88, BE-87, BE-85, BE-84)', () => {
  it('LocationsService creates location', async () => {
    const mockRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest
        .fn()
        .mockImplementation((dto) => Promise.resolve({ id: 'loc-1', ...dto })),
    };
    const service = new LocationsService(mockRepo as any);
    const loc = await service.create({ name: 'Building A', code: 'BLD-A' });
    expect(loc.name).toBe('Building A');
  });

  it('CategoriesService manages depreciation defaults', async () => {
    const mockRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest
        .fn()
        .mockImplementation((dto) => Promise.resolve({ id: 'cat-1', ...dto })),
    };
    const service = new CategoriesService(mockRepo as any);
    const cat = await service.create({
      name: 'Laptops',
      code: 'LAP',
      defaultDepreciationRate: 20,
      defaultUsefulLifeMonths: 36,
    });
    expect(cat.defaultUsefulLifeMonths).toBe(36);
  });

  it('AssetLifecycleService validates state transitions and records history', () => {
    const service = new AssetLifecycleService();
    expect(
      service.validateTransition(AssetStatus.AVAILABLE, AssetStatus.ASSIGNED),
    ).toBe(true);
    expect(() =>
      service.validateTransition(AssetStatus.DISPOSED, AssetStatus.ASSIGNED),
    ).toThrow('Cannot transition asset status from DISPOSED to ASSIGNED');

    const history = service.recordHistory('asset-1', {
      eventType: 'STATUS_CHANGED',
      actorUserId: 'user-1',
      note: 'Assigned to Jane',
    });
    expect(history.id).toBeDefined();
    expect(service.getHistory('asset-1').length).toBe(1);
  });
});
