import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { Location } from './entities/location.entity';
import { Asset } from '../assets/entities/asset.entity';

type MockRepo<T = any> = {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  remove: jest.Mock;
  count: jest.Mock;
  createQueryBuilder: jest.Mock;
};

const createMockQueryBuilder = (rawResult: any[]) => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getRawMany: jest.fn().mockResolvedValue(rawResult),
});

describe('LocationsService', () => {
  let service: LocationsService;
  let locationRepo: MockRepo;
  let assetRepo: MockRepo;

  const makeLocation = (overrides: Partial<Location> = {}): Location =>
    ({
      id: 'loc-1',
      name: 'Warehouse A',
      parentLocationId: null,
      ...overrides,
    }) as Location;

  beforeEach(async () => {
    locationRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    assetRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: getRepositoryToken(Location), useValue: locationRepo },
        { provide: getRepositoryToken(Asset), useValue: assetRepo },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('attaches direct asset counts to each location', async () => {
      const locations = [
        makeLocation({ id: 'loc-1' }),
        makeLocation({ id: 'loc-2' }),
      ];
      locationRepo.find.mockResolvedValue(locations);
      assetRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([
          { locationId: 'loc-1', count: '3' },
          { locationId: 'loc-2', count: '5' },
        ]),
      );

      const result = await service.findAll();

      expect(result.find((l) => l.id === 'loc-1')?.assetCount).toBe(3);
      expect(result.find((l) => l.id === 'loc-2')?.assetCount).toBe(5);
    });

    it('defaults assetCount to 0 for locations with no direct assets', async () => {
      const locations = [makeLocation({ id: 'loc-1' })];
      locationRepo.find.mockResolvedValue(locations);
      assetRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([]));

      const result = await service.findAll();

      expect(result[0].assetCount).toBe(0);
      expect(result[0].totalAssetCount).toBe(0);
    });

    it('rolls up totalAssetCount from descendants for a parent/child hierarchy', async () => {
      // root -> child -> grandchild
      const root = makeLocation({ id: 'root', parentLocationId: null });
      const child = makeLocation({ id: 'child', parentLocationId: 'root' });
      const grandchild = makeLocation({
        id: 'grandchild',
        parentLocationId: 'child',
      });
      locationRepo.find.mockResolvedValue([root, child, grandchild]);

      assetRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([
          { locationId: 'root', count: '1' },
          { locationId: 'child', count: '2' },
          { locationId: 'grandchild', count: '4' },
        ]),
      );

      const result = await service.findAll();
      const byId = new Map(result.map((l) => [l.id, l]));

      expect(byId.get('grandchild')?.totalAssetCount).toBe(4);
      expect(byId.get('child')?.totalAssetCount).toBe(6); // 2 + 4
      expect(byId.get('root')?.totalAssetCount).toBe(7); // 1 + 2 + 4
      // direct counts remain unaffected by rollup
      expect(byId.get('root')?.assetCount).toBe(1);
    });

    it('handles multiple sibling subtrees independently', async () => {
      const root = makeLocation({ id: 'root', parentLocationId: null });
      const childA = makeLocation({ id: 'childA', parentLocationId: 'root' });
      const childB = makeLocation({ id: 'childB', parentLocationId: 'root' });
      locationRepo.find.mockResolvedValue([root, childA, childB]);

      assetRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([
          { locationId: 'childA', count: '2' },
          { locationId: 'childB', count: '3' },
        ]),
      );

      const result = await service.findAll();
      const byId = new Map(result.map((l) => [l.id, l]));

      expect(byId.get('root')?.totalAssetCount).toBe(5);
    });
  });

  describe('findById', () => {
    it('returns the location when found', async () => {
      const loc = makeLocation();
      locationRepo.findOne.mockResolvedValue(loc);

      const result = await service.findById('loc-1');

      expect(result).toBe(loc);
      expect(locationRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'loc-1' },
      });
    });

    it('throws NotFoundException when the location does not exist', async () => {
      locationRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates a location with no parent', async () => {
      const dto = { name: 'New Location' } as any;
      const created = makeLocation({ id: 'new-loc', name: 'New Location' });
      locationRepo.create.mockReturnValue(created);
      locationRepo.save.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(locationRepo.findOne).not.toHaveBeenCalled();
      expect(locationRepo.create).toHaveBeenCalledWith(dto);
      expect(locationRepo.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });

    it('validates the parent location exists before creating', async () => {
      const dto = { name: 'Child', parentLocationId: 'parent-1' } as any;
      const parent = makeLocation({ id: 'parent-1' });
      locationRepo.findOne.mockResolvedValue(parent);
      const created = makeLocation({
        id: 'child-1',
        parentLocationId: 'parent-1',
      });
      locationRepo.create.mockReturnValue(created);
      locationRepo.save.mockResolvedValue(created);

      await service.create(dto);

      expect(locationRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'parent-1' },
      });
    });

    it('throws NotFoundException when the given parent does not exist', async () => {
      const dto = { name: 'Child', parentLocationId: 'missing-parent' } as any;
      locationRepo.findOne.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(locationRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates fields and saves', async () => {
      const loc = makeLocation({ id: 'loc-1', name: 'Old Name' });
      locationRepo.findOne.mockResolvedValue(loc);
      locationRepo.save.mockImplementation((l) => Promise.resolve(l));

      const result = await service.update('loc-1', { name: 'New Name' } as any);

      expect(result.name).toBe('New Name');
      expect(locationRepo.save).toHaveBeenCalled();
    });

    it('throws BadRequestException when a location is set as its own parent', async () => {
      const loc = makeLocation({ id: 'loc-1' });
      locationRepo.findOne.mockResolvedValue(loc);

      await expect(
        service.update('loc-1', { parentLocationId: 'loc-1' } as any),
      ).rejects.toThrow(BadRequestException);
      expect(locationRepo.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when moving a location under its own descendant', async () => {
      // hierarchy: A -> B -> C. Trying to set A's parent to C (a descendant) must fail.
      const locA = makeLocation({ id: 'A', parentLocationId: null });
      const locB = makeLocation({ id: 'B', parentLocationId: 'A' });
      const locC = makeLocation({ id: 'C', parentLocationId: 'B' });

      // First findOne call (inside update) resolves the location being updated (A).
      // Subsequent findOne calls walk up from candidate parent (C) via assertNotDescendant.
      locationRepo.findOne
        .mockResolvedValueOnce(locA) // findById('A') inside update()
        .mockResolvedValueOnce(locC) // assertNotDescendant walk: current = 'C'
        .mockResolvedValueOnce(locB); // assertNotDescendant walk: current = 'B' -> matches id 'A'? no, continues
      // Note: walk stops as soon as current === id ('A'), which happens once we
      // reach locB.parentLocationId === 'A'. We only need enough mocked calls to reach that point.

      await expect(
        service.update('A', { parentLocationId: 'C' } as any),
      ).rejects.toThrow(BadRequestException);
      expect(locationRepo.save).not.toHaveBeenCalled();
    });

    it('allows moving a location under an unrelated location', async () => {
      const locA = makeLocation({ id: 'A', parentLocationId: null });
      const unrelated = makeLocation({ id: 'X', parentLocationId: null });

      locationRepo.findOne
        .mockResolvedValueOnce(locA) // findById('A') inside update()
        .mockResolvedValueOnce(unrelated); // assertNotDescendant walk: current = 'X', no parent -> loop ends
      locationRepo.save.mockImplementation((l) => Promise.resolve(l));

      const result = await service.update('A', {
        parentLocationId: 'X',
      } as any);

      expect(result.parentLocationId).toBe('X');
      expect(locationRepo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when updating a location that does not exist', async () => {
      locationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('missing', { name: 'x' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('removes a location with no children and no assets', async () => {
      const loc = makeLocation({ id: 'loc-1' });
      locationRepo.findOne.mockResolvedValue(loc);
      locationRepo.count.mockResolvedValue(0);
      assetRepo.count.mockResolvedValue(0);
      locationRepo.remove.mockResolvedValue(loc);

      const result = await service.delete('loc-1');

      expect(locationRepo.remove).toHaveBeenCalledWith(loc);
      expect(result).toBe(loc);
    });

    it('throws ConflictException when the location has child locations', async () => {
      const loc = makeLocation({ id: 'loc-1' });
      locationRepo.findOne.mockResolvedValue(loc);
      locationRepo.count.mockResolvedValue(2);

      await expect(service.delete('loc-1')).rejects.toThrow(ConflictException);
      expect(locationRepo.remove).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the location still has assigned assets', async () => {
      const loc = makeLocation({ id: 'loc-1' });
      locationRepo.findOne.mockResolvedValue(loc);
      locationRepo.count.mockResolvedValue(0); // no child locations
      assetRepo.count.mockResolvedValue(4);

      await expect(service.delete('loc-1')).rejects.toThrow(ConflictException);
      expect(locationRepo.remove).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when deleting a location that does not exist', async () => {
      locationRepo.findOne.mockResolvedValue(null);

      await expect(service.delete('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(locationRepo.remove).not.toHaveBeenCalled();
    });
  });
});
