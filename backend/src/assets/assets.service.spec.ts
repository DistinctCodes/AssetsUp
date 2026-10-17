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

  describe('findPublicByScan', () => {
    it('looks up a UUID by id and returns the public shape', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue({
        id: '3b241101-e2bb-4255-8caf-4136c566a962',
        assetTag: 'AST-1',
        name: 'Laptop',
        status: 'AVAILABLE',
        purchaseCost: 5,
      } as any);
      const out = await service.findPublicByScan(
        '3b241101-e2bb-4255-8caf-4136c566a962',
      );
      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '3b241101-e2bb-4255-8caf-4136c566a962' },
        }),
      );
      expect(out).not.toHaveProperty('purchaseCost');
    });

    it('looks up a non-UUID by asset tag', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      await expect(service.findPublicByScan('AST-9')).rejects.toThrow(
        'Asset not found',
      );
      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { assetTag: 'AST-9' } }),
      );
    });
  });
});
