import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  AuditLogsService,
  AuditLogQuery,
  AuditLogListResult,
} from './audit-logs.service';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

type MockQueryBuilder = {
  orderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  andWhere: jest.Mock;
  getManyAndCount: jest.Mock;
};

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let repo: jest.Mocked<Repository<AuditLog>>;
  let cacheManager: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let qb: MockQueryBuilder;

  const buildQueryBuilder = (): MockQueryBuilder => {
    const builder: Partial<MockQueryBuilder> = {};
    builder.orderBy = jest.fn().mockReturnValue(builder);
    builder.skip = jest.fn().mockReturnValue(builder);
    builder.take = jest.fn().mockReturnValue(builder);
    builder.andWhere = jest.fn().mockReturnValue(builder);
    builder.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
    return builder as MockQueryBuilder;
  };

  beforeEach(async () => {
    qb = buildQueryBuilder();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(
              () => qb as unknown as SelectQueryBuilder<AuditLog>,
            ),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
    repo = module.get(getRepositoryToken(AuditLog));
    cacheManager = module.get(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logAction', () => {
    const params = {
      action: AuditAction.CREATED,
      entityType: 'Invoice',
      entityId: 'inv-123',
      actorId: 'user-1',
      previousValue: { status: 'draft' },
      newValue: { status: 'sent' },
      ipAddress: '127.0.0.1',
      userAgent: 'jest-test-agent',
    };

    it('creates the audit log entity with the correct fields', async () => {
      const created = { ...params, id: 'log-1' };
      (repo.create as jest.Mock).mockReturnValue(created);
      (repo.save as jest.Mock).mockResolvedValue({ ...created, id: 'log-1' });

      await service.logAction(params);

      expect(repo.create).toHaveBeenCalledWith({
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        actorId: params.actorId,
        previousValue: params.previousValue,
        newValue: params.newValue,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
    });

    it('persists the created entity via save()', async () => {
      const created = { ...params };
      const saved = { ...params, id: 'log-1' };
      (repo.create as jest.Mock).mockReturnValue(created);
      (repo.save as jest.Mock).mockResolvedValue(saved);

      const result = await service.logAction(params);

      expect(repo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(saved);
    });

    it('invalidates the list cache after saving', async () => {
      (repo.create as jest.Mock).mockReturnValue(params);
      (repo.save as jest.Mock).mockResolvedValue({ ...params, id: 'log-1' });

      await service.logAction(params);

      expect(cacheManager.del).toHaveBeenCalledWith('audit-logs:list');
    });

    it('handles optional fields being omitted', async () => {
      const minimalParams = {
        action: AuditAction.DELETED,
        entityType: 'Invoice',
        entityId: 'inv-999',
      };
      (repo.create as jest.Mock).mockReturnValue(minimalParams);
      (repo.save as jest.Mock).mockResolvedValue({
        ...minimalParams,
        id: 'log-2',
      });

      await service.logAction(minimalParams);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.DELETED,
          entityType: 'Invoice',
          entityId: 'inv-999',
          actorId: undefined,
          previousValue: undefined,
          newValue: undefined,
          ipAddress: undefined,
          userAgent: undefined,
        }),
      );
    });
  });

  describe('findAll', () => {
    describe('cache hit', () => {
      it('returns the cached result and never touches the query builder', async () => {
        const cachedResult: AuditLogListResult = {
          items: [{ id: 'log-1' } as AuditLog],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        };
        cacheManager.get.mockResolvedValue(cachedResult);

        const query: AuditLogQuery = { entityType: 'Invoice' };
        const result = await service.findAll(query);

        expect(result).toEqual(cachedResult);
        expect(repo.createQueryBuilder).not.toHaveBeenCalled();
        expect(cacheManager.set).not.toHaveBeenCalled();
      });

      it('builds the cache key from the full query object', async () => {
        cacheManager.get.mockResolvedValue({
          items: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        });

        const query: AuditLogQuery = {
          entityType: 'Invoice',
          page: 2,
          limit: 10,
        };
        await service.findAll(query);

        expect(cacheManager.get).toHaveBeenCalledWith(
          `audit-logs:list:${JSON.stringify(query)}`,
        );
      });
    });

    describe('cache miss', () => {
      beforeEach(() => {
        cacheManager.get.mockResolvedValue(undefined);
      });

      it('queries the repository and caches the result on a miss', async () => {
        qb.getManyAndCount.mockResolvedValue([[{ id: 'log-1' }], 1]);

        const query: AuditLogQuery = {};
        const result = await service.findAll(query);

        expect(repo.createQueryBuilder).toHaveBeenCalledWith('log');
        expect(qb.orderBy).toHaveBeenCalledWith('log.createdAt', 'DESC');
        expect(result).toEqual({
          items: [{ id: 'log-1' }],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        });
        expect(cacheManager.set).toHaveBeenCalledWith(
          `audit-logs:list:${JSON.stringify(query)}`,
          result,
          30000,
        );
      });

      it('applies the entityType filter when provided', async () => {
        await service.findAll({ entityType: 'Invoice' });
        expect(qb.andWhere).toHaveBeenCalledWith(
          'log.entityType = :entityType',
          {
            entityType: 'Invoice',
          },
        );
      });

      it('applies the entityId filter when provided', async () => {
        await service.findAll({ entityId: 'inv-123' });
        expect(qb.andWhere).toHaveBeenCalledWith('log.entityId = :entityId', {
          entityId: 'inv-123',
        });
      });

      it('applies the actorId filter when provided', async () => {
        await service.findAll({ actorId: 'user-1' });
        expect(qb.andWhere).toHaveBeenCalledWith('log.actorId = :actorId', {
          actorId: 'user-1',
        });
      });

      it('applies the action filter when provided', async () => {
        await service.findAll({ action: AuditAction.UPDATED });
        expect(qb.andWhere).toHaveBeenCalledWith('log.action = :action', {
          action: AuditAction.UPDATED,
        });
      });

      it('applies the from date filter when provided', async () => {
        const from = new Date('2026-01-01T00:00:00.000Z');
        await service.findAll({ from });
        expect(qb.andWhere).toHaveBeenCalledWith('log.createdAt >= :from', {
          from,
        });
      });

      it('applies the to date filter when provided', async () => {
        const to = new Date('2026-01-31T23:59:59.000Z');
        await service.findAll({ to });
        expect(qb.andWhere).toHaveBeenCalledWith('log.createdAt <= :to', {
          to,
        });
      });

      it('combines multiple filters in a single query', async () => {
        const from = new Date('2026-01-01T00:00:00.000Z');
        const to = new Date('2026-01-31T23:59:59.000Z');

        await service.findAll({
          entityType: 'Invoice',
          entityId: 'inv-123',
          actorId: 'user-1',
          action: AuditAction.CREATED,
          from,
          to,
        });

        expect(qb.andWhere).toHaveBeenCalledTimes(6);
        expect(qb.andWhere).toHaveBeenCalledWith(
          'log.entityType = :entityType',
          {
            entityType: 'Invoice',
          },
        );
        expect(qb.andWhere).toHaveBeenCalledWith('log.entityId = :entityId', {
          entityId: 'inv-123',
        });
        expect(qb.andWhere).toHaveBeenCalledWith('log.actorId = :actorId', {
          actorId: 'user-1',
        });
        expect(qb.andWhere).toHaveBeenCalledWith('log.action = :action', {
          action: AuditAction.CREATED,
        });
        expect(qb.andWhere).toHaveBeenCalledWith('log.createdAt >= :from', {
          from,
        });
        expect(qb.andWhere).toHaveBeenCalledWith('log.createdAt <= :to', {
          to,
        });
      });

      it('applies no filters when none are provided', async () => {
        await service.findAll({});
        expect(qb.andWhere).not.toHaveBeenCalled();
      });

      describe('pagination math', () => {
        it('defaults to page 1 and limit 20 when not provided', async () => {
          qb.getManyAndCount.mockResolvedValue([[], 0]);
          const result = await service.findAll({});

          expect(qb.skip).toHaveBeenCalledWith(0);
          expect(qb.take).toHaveBeenCalledWith(20);
          expect(result.page).toBe(1);
          expect(result.limit).toBe(20);
        });

        it('computes skip correctly for page 3 with limit 10', async () => {
          qb.getManyAndCount.mockResolvedValue([[], 25]);
          const result = await service.findAll({ page: 3, limit: 10 });

          expect(qb.skip).toHaveBeenCalledWith(20); // (3 - 1) * 10
          expect(qb.take).toHaveBeenCalledWith(10);
          expect(result.totalPages).toBe(3); // ceil(25 / 10)
        });

        it('computes totalPages as 0 when there are no results', async () => {
          qb.getManyAndCount.mockResolvedValue([[], 0]);
          const result = await service.findAll({ page: 1, limit: 20 });

          expect(result.total).toBe(0);
          expect(result.totalPages).toBe(0);
        });

        it('rounds totalPages up when total is not evenly divisible by limit', async () => {
          qb.getManyAndCount.mockResolvedValue([[], 21]);
          const result = await service.findAll({ page: 1, limit: 20 });

          expect(result.totalPages).toBe(2); // ceil(21 / 20)
        });

        it('handles page 1 skip being 0 regardless of limit', async () => {
          qb.getManyAndCount.mockResolvedValue([[], 5]);
          await service.findAll({ page: 1, limit: 50 });

          expect(qb.skip).toHaveBeenCalledWith(0);
          expect(qb.take).toHaveBeenCalledWith(50);
        });
      });
    });
  });

  describe('findById', () => {
    it('returns the audit log when found', async () => {
      const log = { id: 'log-1', entityType: 'Invoice' };
      (repo.findOne as jest.Mock).mockResolvedValue(log);

      const result = await service.findById('log-1');

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'log-1' } });
      expect(result).toEqual(log);
    });

    it('throws NotFoundException when the audit log does not exist', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('missing-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById('missing-id')).rejects.toThrow(
        'Audit log missing-id not found',
      );
    });
  });
});
