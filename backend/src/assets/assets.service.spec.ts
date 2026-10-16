import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { createMock } from '@golevelup/ts-jest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssetsService } from './assets.service';
import { Asset } from './entities/asset.entity';
import { AssetLifecycleService, AssetStatus } from './asset-lifecycle.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AssetHistoryService } from './asset-history.service';

describe('AssetsService', () => {
  let service: AssetsService;
  let repository: Repository<Asset>;

  const mockAsset = {
    id: 'ast-1',
    name: 'MacBook Pro',
    assetTag: 'AST-100',
    status: AssetStatus.AVAILABLE,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        {
          provide: getRepositoryToken(Asset),
          useValue: createMock<Repository<Asset>>(),
        },
        {
          provide: AssetLifecycleService,
          useValue: createMock<AssetLifecycleService>(),
        },
        {
          provide: AuditLogsService,
          useValue: createMock<AuditLogsService>(),
        },
        {
          provide: AssetHistoryService,
          useValue: createMock<AssetHistoryService>(),
        },
        {
          provide: DataSource,
          useValue: createMock<DataSource>(),
        },
        {
          provide: EventEmitter2,
          useValue: createMock<EventEmitter2>(),
        },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
    repository = module.get(getRepositoryToken(Asset));
  });

  it('create - should create and return new asset record', async () => {
    jest.spyOn(repository, 'count').mockResolvedValue(0);
    jest.spyOn(repository, 'create').mockReturnValue(mockAsset as any);
    jest.spyOn(repository, 'save').mockResolvedValue(mockAsset as any);

    const result = await service.create({ name: 'MacBook Pro' } as any);

    expect(result).toEqual(mockAsset);
    expect(repository.save).toHaveBeenCalled();
  });

  it('update - should return updated asset record', async () => {
    const updatedAsset = { ...mockAsset, name: 'MacBook Pro M3' };
    jest.spyOn(repository, 'findOne').mockResolvedValue(mockAsset as any);
    jest.spyOn(repository, 'save').mockResolvedValue(updatedAsset as any);

    const result = await service.update('ast-1', {
      name: 'MacBook Pro M3',
    } as any);

    expect(result.name).toBe('MacBook Pro M3');
  });

  it('delete - should soft-delete asset', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue(mockAsset as any);
    jest.spyOn(repository, 'softRemove').mockResolvedValue(mockAsset as any);

    await service.delete('ast-1');

    expect(repository.softRemove).toHaveBeenCalledWith(mockAsset);
  });

  describe('findAll', () => {
    function mockQb() {
      const qb: any = {
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb);
      return qb;
    }

    it('escapes LIKE wildcards so "100%" matches literally', async () => {
      const qb = mockQb();
      await service.findAll({ search: '100%' });
      const [sql, params] = qb.andWhere.mock.calls[0];
      expect(params).toEqual({ s: '%100\\%%' });
      expect(sql).toContain("ESCAPE '\\'");
    });

    it('clamps limit to 100 and uses an id tiebreaker for stable pages', async () => {
      const qb = mockQb();
      const result = await service.findAll({ page: 3, limit: 1_000_000 });
      expect(qb.take).toHaveBeenCalledWith(100);
      expect(qb.skip).toHaveBeenCalledWith(200);
      expect(qb.orderBy).toHaveBeenCalledWith('asset.createdAt', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('asset.id', 'ASC');
      expect(result.limit).toBe(100);
    });

    it('sorts by a whitelisted column and ignores unknown ones', async () => {
      const qb = mockQb();
      await service.findAll({ sortBy: 'name', sortOrder: 'ASC' });
      expect(qb.orderBy).toHaveBeenCalledWith('asset.name', 'ASC');
      await service.findAll({ sortBy: 'passwordHash; --' });
      expect(qb.orderBy).toHaveBeenLastCalledWith('asset.createdAt', 'DESC');
    });
  });
});
