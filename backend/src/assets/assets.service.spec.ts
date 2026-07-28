import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createMock } from '@golevelup/ts-jest';
import { AssetsService } from './assets.service';
import { Asset } from './entities/asset.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { FileService } from '../files/file.service';
import { AssetCodeGeneratorService } from './services/asset-code-generator.service';

describe('AssetsService', () => {
  let service: AssetsService;
  let repository: Repository<Asset>;
  let auditLogsService: AuditLogsService;

  const mockAsset = {
    id: 'ast-1',
    name: 'MacBook Pro',
    assetTag: 'AST-100',
    status: 'AVAILABLE',
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
          provide: AuditLogsService,
          useValue: createMock<AuditLogsService>(),
        },
        {
          provide: FileService,
          useValue: createMock<FileService>(),
        },
        {
          provide: AssetCodeGeneratorService,
          useValue: createMock<AssetCodeGeneratorService>(),
        },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
    repository = module.get(getRepositoryToken(Asset));
    auditLogsService = module.get<AuditLogsService>(AuditLogsService);
  });

  it('create - should create and return new asset record', async () => {
    jest.spyOn(repository, 'create').mockReturnValue(mockAsset as any);
    jest.spyOn(repository, 'save').mockResolvedValue(mockAsset as any);

    const result = await service.createAsset({
      name: 'MacBook Pro',
      assetTag: 'AST-100',
    } as any);

    expect(result).toEqual(mockAsset);
    expect(repository.save).toHaveBeenCalled();
  });

  it('update - should return updated asset record', async () => {
    const updatedAsset = { ...mockAsset, name: 'MacBook Pro M3' };
    jest.spyOn(repository, 'findOne').mockResolvedValue(mockAsset as any);
    jest.spyOn(repository, 'save').mockResolvedValue(updatedAsset as any);

    const result = await service.update('ast-1', { name: 'MacBook Pro M3' } as any);

    expect(result.name).toBe('MacBook Pro M3');
  });

  it('delete - should soft-delete asset and record audit log', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue(mockAsset as any);
    jest.spyOn(repository, 'softRemove').mockResolvedValue(mockAsset as any);

    await service.delete('ast-1', { id: 'usr-1' } as any);

    expect(repository.softRemove).toHaveBeenCalledWith(mockAsset);
    expect(auditLogsService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETED',
        entityId: 'ast-1',
      }),
    );
  });
});