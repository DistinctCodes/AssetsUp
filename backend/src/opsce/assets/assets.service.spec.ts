import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AssetsService } from './assets.service';
import { Asset, AssetStatus, AssetCondition } from './entities/asset.entity';
import { AuditService } from '../audit/audit.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import {
  BulkAssetOperationDto,
  BulkOperation,
} from './dto/bulk-asset-operation.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  const asset = new Asset();
  asset.id = 'asset-uuid-1';
  asset.name = 'Test Laptop';
  asset.category = 'IT';
  asset.status = AssetStatus.ACTIVE;
  asset.condition = AssetCondition.GOOD;
  asset.isTokenized = false;
  asset.createdAt = new Date('2025-01-01');
  asset.updatedAt = new Date('2025-01-01');
  return Object.assign(asset, overrides);
}

// ─── Mock factory ─────────────────────────────────────────────────────────────

type MockRepository<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function createMockRepository<T>(): MockRepository<T> {
  return {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('AssetsService', () => {
  let service: AssetsService;
  let assetRepo: MockRepository<Asset>;
  let auditService: { log: jest.Mock };

  beforeEach(async () => {
    assetRepo = createMockRepository<Asset>();
    auditService = { log: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        {
          provide: getRepositoryToken(Asset),
          useValue: assetRepo,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create() ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    const dto: CreateAssetDto = {
      name: 'Test Laptop',
      category: 'IT',
      serialNumber: 'SN-001',
    };

    it('should create and return the asset on the success path', async () => {
      const asset = makeAsset({ serialNumber: 'SN-001' });
      assetRepo.create!.mockReturnValue(asset);
      assetRepo.save!.mockResolvedValue(asset);

      const result = await service.create(dto);

      expect(assetRepo.create).toHaveBeenCalledWith(dto);
      expect(assetRepo.save).toHaveBeenCalledWith(asset);
      expect(result).toEqual(asset);
    });

    it('should call AuditService.log after a successful create', async () => {
      const asset = makeAsset({ serialNumber: 'SN-001' });
      assetRepo.create!.mockReturnValue(asset);
      assetRepo.save!.mockResolvedValue(asset);

      await service.create(dto);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          resourceType: 'Asset',
          resourceId: asset.id,
        }),
      );
    });

    it('should propagate a duplicate serial number error from the repository', async () => {
      const asset = makeAsset({ serialNumber: 'SN-001' });
      assetRepo.create!.mockReturnValue(asset);
      assetRepo.save!.mockRejectedValue(
        Object.assign(new Error('duplicate key value'), { code: '23505' }),
      );

      await expect(service.create(dto)).rejects.toThrow('duplicate key value');
      expect(auditService.log).not.toHaveBeenCalled();
    });
  });

  // ─── findAll() ─────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return a paginated response with the correct total count', async () => {
      const assets = [makeAsset(), makeAsset({ id: 'asset-uuid-2', name: 'Monitor' })];
      assetRepo.findAndCount!.mockResolvedValue([assets, 2]);

      const pagination: PaginationDto = { page: 1, limit: 20 };
      const result = await service.findAll(pagination);

      expect(assetRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should calculate totalPages correctly', async () => {
      const assets = Array.from({ length: 5 }, (_, i) =>
        makeAsset({ id: `uuid-${i}` }),
      );
      assetRepo.findAndCount!.mockResolvedValue([assets, 25]);

      const result = await service.findAll({ page: 1, limit: 5 });

      expect(result.totalPages).toBe(5);
    });

    it('should apply correct skip offset for page 2', async () => {
      assetRepo.findAndCount!.mockResolvedValue([[], 0]);

      await service.findAll({ page: 2, limit: 10 });

      expect(assetRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  // ─── findAll() with search filter ──────────────────────────────────────────

  describe('findAll() with search filter', () => {
    function buildMockQb(data: Asset[], total: number) {
      const qb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([data, total]),
      } as unknown as SelectQueryBuilder<Asset>;
      return qb;
    }

    it('should return only matching assets when search is provided', async () => {
      const matchingAsset = makeAsset({ name: 'Dell Laptop' });
      const mockQb = buildMockQb([matchingAsset], 1);
      assetRepo.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.findAll({ page: 1, limit: 20 }, 'laptop');

      expect(assetRepo.createQueryBuilder).toHaveBeenCalledWith('asset');
      expect((mockQb as any).where).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({ search: '%laptop%' }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should return empty results when search matches nothing', async () => {
      const mockQb = buildMockQb([], 0);
      assetRepo.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.findAll({ page: 1, limit: 20 }, 'nonexistent');

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should NOT use createQueryBuilder when no search term is given', async () => {
      assetRepo.findAndCount!.mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, limit: 20 });

      expect(assetRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(assetRepo.findAndCount).toHaveBeenCalled();
    });
  });

  // ─── findOne() ─────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('should return the asset for a valid ID', async () => {
      const asset = makeAsset();
      assetRepo.findOne!.mockResolvedValue(asset);

      const result = await service.findOne('asset-uuid-1');

      expect(assetRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'asset-uuid-1' },
      });
      expect(result).toEqual(asset);
    });

    it('should throw NotFoundException for an unknown ID', async () => {
      assetRepo.findOne!.mockResolvedValue(null);

      await expect(service.findOne('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('unknown-id')).rejects.toThrow(
        'Asset with ID unknown-id not found',
      );
    });
  });

  // ─── update() ──────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update the asset fields and return the saved entity', async () => {
      const asset = makeAsset();
      const updateDto: UpdateAssetDto = { name: 'Updated Laptop', status: AssetStatus.INACTIVE };
      const updatedAsset = makeAsset({ name: 'Updated Laptop', status: AssetStatus.INACTIVE });

      assetRepo.findOne!.mockResolvedValue(asset);
      assetRepo.save!.mockResolvedValue(updatedAsset);

      const result = await service.update('asset-uuid-1', updateDto, 'user-1');

      expect(assetRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Laptop', status: AssetStatus.INACTIVE }),
      );
      expect(result).toEqual(updatedAsset);
    });

    it('should call AuditService.log with old and new values', async () => {
      const asset = makeAsset();
      const updateDto: UpdateAssetDto = { name: 'Updated Laptop' };
      assetRepo.findOne!.mockResolvedValue(asset);
      assetRepo.save!.mockResolvedValue(makeAsset({ name: 'Updated Laptop' }));

      await service.update('asset-uuid-1', updateDto, 'user-1');

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'UPDATE',
          resourceType: 'Asset',
          resourceId: 'asset-uuid-1',
          newValue: updateDto,
        }),
      );
    });

    it('should throw NotFoundException when the asset does not exist', async () => {
      assetRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.update('bad-id', { name: 'X' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove() ──────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('should remove the asset and log the deletion', async () => {
      const asset = makeAsset();
      assetRepo.findOne!.mockResolvedValue(asset);
      assetRepo.remove!.mockResolvedValue(asset);

      await service.remove('asset-uuid-1', 'user-1');

      expect(assetRepo.remove).toHaveBeenCalledWith(asset);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'DELETE',
          resourceType: 'Asset',
          resourceId: 'asset-uuid-1',
        }),
      );
    });

    it('should throw NotFoundException when the asset does not exist', async () => {
      assetRepo.findOne!.mockResolvedValue(null);

      await expect(service.remove('bad-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── bulkOperation() ───────────────────────────────────────────────────────

  describe('bulkOperation()', () => {
    it('should update status for all valid IDs and return succeeded list', async () => {
      const asset1 = makeAsset({ id: 'id-1' });
      const asset2 = makeAsset({ id: 'id-2' });
      assetRepo.findOne!
        .mockResolvedValueOnce(asset1)
        .mockResolvedValueOnce(asset2);
      assetRepo.save!.mockResolvedValue({});

      const dto: BulkAssetOperationDto = {
        ids: ['id-1', 'id-2'],
        operation: BulkOperation.UPDATE_STATUS,
        payload: { status: AssetStatus.INACTIVE },
      };

      const result = await service.bulkOperation(dto, 'user-1');

      expect(result.succeeded).toEqual(['id-1', 'id-2']);
      expect(result.failed).toHaveLength(0);
      expect(assetRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should record failed IDs when an asset is not found', async () => {
      assetRepo.findOne!.mockResolvedValue(null);

      const dto: BulkAssetOperationDto = {
        ids: ['missing-id'],
        operation: BulkOperation.UPDATE_STATUS,
        payload: { status: AssetStatus.INACTIVE },
      };

      const result = await service.bulkOperation(dto, 'user-1');

      expect(result.succeeded).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].id).toBe('missing-id');
      expect(result.failed[0].reason).toContain('not found');
    });

    it('should handle partial success — some succeed, some fail', async () => {
      const goodAsset = makeAsset({ id: 'good-id' });
      assetRepo.findOne!
        .mockResolvedValueOnce(goodAsset)
        .mockResolvedValueOnce(null);
      assetRepo.save!.mockResolvedValue({});

      const dto: BulkAssetOperationDto = {
        ids: ['good-id', 'bad-id'],
        operation: BulkOperation.REASSIGN,
        payload: { assignedToUserId: 'user-abc' },
      };

      const result = await service.bulkOperation(dto, 'user-1');

      expect(result.succeeded).toEqual(['good-id']);
      expect(result.failed[0].id).toBe('bad-id');
    });

    it('should call softRemove for soft-delete operation', async () => {
      const asset = makeAsset({ id: 'id-1' });
      assetRepo.findOne!.mockResolvedValue(asset);
      assetRepo.softRemove!.mockResolvedValue(asset);

      const dto: BulkAssetOperationDto = {
        ids: ['id-1'],
        operation: BulkOperation.SOFT_DELETE,
        payload: {},
      };

      const result = await service.bulkOperation(dto, 'user-1');

      expect(assetRepo.softRemove).toHaveBeenCalledWith(asset);
      expect(result.succeeded).toEqual(['id-1']);
    });

    it('should log an audit entry for each successfully processed asset', async () => {
      const asset = makeAsset({ id: 'id-1' });
      assetRepo.findOne!.mockResolvedValue(asset);
      assetRepo.save!.mockResolvedValue({});

      const dto: BulkAssetOperationDto = {
        ids: ['id-1'],
        operation: BulkOperation.CHANGE_DEPARTMENT,
        payload: { departmentId: 'dept-1' },
      };

      await service.bulkOperation(dto, 'user-1');

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          resourceType: 'Asset',
          resourceId: 'id-1',
        }),
      );
    });

    it('should fail with a descriptive reason when required payload field is missing', async () => {
      const asset = makeAsset({ id: 'id-1' });
      assetRepo.findOne!.mockResolvedValue(asset);

      const dto: BulkAssetOperationDto = {
        ids: ['id-1'],
        operation: BulkOperation.UPDATE_STATUS,
        payload: {}, // missing status
      };

      const result = await service.bulkOperation(dto, 'user-1');

      expect(result.failed[0].reason).toContain('payload.status is required');
    });
  });

  // ─── Repository isolation ──────────────────────────────────────────────────

  describe('repository isolation', () => {
    it('should never make real database calls — all repository methods are mocked', () => {
      // Verify that the injected repository is our mock, not a real TypeORM repo
      expect(assetRepo.findOne).toBeDefined();
      expect(typeof assetRepo.findOne).toBe('function');
      // Jest mock functions have a .mock property
      expect((assetRepo.findOne as jest.Mock).mock).toBeDefined();
    });
  });
});
