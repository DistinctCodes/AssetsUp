import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssetsService } from './assets.service';
import { AssetLifecycleService, AssetStatus } from './asset-lifecycle.service';
import { AssetHistoryAction } from './entities/asset-history-event.entity';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';

/**
 * Side effects of status changes, transfers and bulk operations: audit rows are
 * written with the object form of `logAction`, history is persisted through
 * `AssetHistoryService` in the same transaction, and domain events go out only
 * after the transaction commits.
 */
describe('AssetsService side effects', () => {
  const manager = { findOne: jest.fn(), save: jest.fn(), softRemove: jest.fn() };
  const dataSource = { transaction: jest.fn() };
  const repo = { findOne: jest.fn() };
  const audit = { logAction: jest.fn() };
  const history = { record: jest.fn() };
  const emitter = { emit: jest.fn() };
  const lifecycle = new AssetLifecycleService();

  let service: AssetsService;
  let asset: { id: string; status: string; departmentId?: string; assignedToUserId?: string | null };

  /** Runs the transaction callback like TypeORM does, returning its result. */
  const commit = () =>
    dataSource.transaction.mockImplementation((cb: (m: unknown) => unknown) => cb(manager));
  /** Runs the callback, then fails the way a later statement would: a rollback. */
  const rollback = () =>
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => unknown) => {
      await cb(manager);
      throw new Error('commit failed');
    });

  beforeEach(() => {
    jest.resetAllMocks();
    asset = { id: 'a1', status: AssetStatus.AVAILABLE, departmentId: 'd1' };
    manager.findOne.mockImplementation(() => Promise.resolve(asset));
    manager.save.mockImplementation((a: unknown) => Promise.resolve(a));
    repo.findOne.mockResolvedValue({ id: 'a1' });
    audit.logAction.mockResolvedValue({});
    history.record.mockResolvedValue({});
    commit();
    service = new AssetsService(
      repo as never,
      lifecycle,
      audit as never,
      history as never,
      dataSource as unknown as DataSource,
      emitter as unknown as EventEmitter2,
    );
  });

  describe('updateStatus', () => {
    it('writes an audit row in the object form (never the positional one)', async () => {
      await service.updateStatus(
        'a1',
        { status: 'IN_MAINTENANCE', reason: 'screen' } as never,
        'actor-1',
      );

      expect(audit.logAction).toHaveBeenCalledTimes(1);
      expect(audit.logAction).toHaveBeenCalledWith({
        action: AuditAction.STATUS_CHANGED,
        entityType: 'asset',
        entityId: 'a1',
        actorId: 'actor-1',
        previousValue: { status: AssetStatus.AVAILABLE },
        newValue: { status: AssetStatus.IN_MAINTENANCE, reason: 'screen' },
      });
    });

    it('awaits the audit write, so a failure is not an unhandled rejection', async () => {
      let finished = false;
      audit.logAction.mockImplementation(async () => {
        await Promise.resolve();
        finished = true;
      });

      await service.updateStatus('a1', { status: 'IN_MAINTENANCE' } as never);

      expect(finished).toBe(true);
    });

    it('does not fail the request when the audit write fails after the commit', async () => {
      audit.logAction.mockRejectedValue(new Error('audit down'));

      await expect(
        service.updateStatus('a1', { status: 'IN_MAINTENANCE' } as never),
      ).resolves.toEqual({ id: 'a1' });
    });

    it('emits the event only after the transaction committed', async () => {
      const order: string[] = [];
      dataSource.transaction.mockImplementation(async (cb: (m: unknown) => unknown) => {
        const result = await cb(manager);
        order.push('commit');
        return result;
      });
      emitter.emit.mockImplementation(() => order.push('emit'));

      await service.updateStatus('a1', { status: 'IN_MAINTENANCE' } as never);

      expect(order).toEqual(['commit', 'emit']);
      expect(emitter.emit).toHaveBeenCalledWith('asset.status_changed', {
        assetId: 'a1',
        departmentId: 'd1',
        previousStatus: AssetStatus.AVAILABLE,
        newStatus: AssetStatus.IN_MAINTENANCE,
      });
    });

    it('emits nothing and writes no audit row when the transaction rolls back', async () => {
      rollback();

      await expect(
        service.updateStatus('a1', { status: 'IN_MAINTENANCE' } as never),
      ).rejects.toThrow('commit failed');

      expect(emitter.emit).not.toHaveBeenCalled();
      expect(audit.logAction).not.toHaveBeenCalled();
    });

    it('does nothing when the status is unchanged', async () => {
      await service.updateStatus('a1', { status: 'AVAILABLE' } as never);

      expect(history.record).not.toHaveBeenCalled();
      expect(emitter.emit).not.toHaveBeenCalled();
      expect(audit.logAction).not.toHaveBeenCalled();
    });
  });

  describe('transfer', () => {
    it('writes the audit row in the object form and emits after the commit', async () => {
      await service.transfer('a1', { departmentId: 'd2' } as never, 'actor-1');

      expect(audit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.UPDATED,
          entityType: 'asset',
          entityId: 'a1',
          actorId: 'actor-1',
        }),
      );
      expect(emitter.emit).toHaveBeenCalledWith(
        'asset.transferred',
        expect.objectContaining({ assetId: 'a1', actorId: 'actor-1' }),
      );
    });

    it('emits nothing when the transaction rolls back after the transfer', async () => {
      manager.findOne.mockImplementation((entity: { name?: string }) =>
        Promise.resolve(entity?.name === 'Department' ? { id: 'd2' } : asset),
      );
      rollback();

      await expect(
        service.transfer('a1', { departmentId: 'd2' } as never),
      ).rejects.toThrow('commit failed');

      expect(emitter.emit).not.toHaveBeenCalled();
      expect(audit.logAction).not.toHaveBeenCalled();
    });
  });

  describe('bulk operations persist history in the transaction', () => {
    it('bulkStatus records an asset_history event with the transaction manager', async () => {
      const result = await service.bulkStatus(
        { ids: ['a1'], status: AssetStatus.IN_MAINTENANCE } as never,
        'actor-1',
      );

      expect(result.succeeded).toEqual(['a1']);
      expect(history.record).toHaveBeenCalledWith(
        expect.objectContaining({
          assetId: 'a1',
          action: AssetHistoryAction.STATUS_CHANGED,
          performedById: 'actor-1',
          previousValue: { status: AssetStatus.AVAILABLE },
          newValue: { status: AssetStatus.IN_MAINTENANCE },
        }),
        manager,
      );
      expect(emitter.emit).toHaveBeenCalledWith(
        'asset.status_changed',
        expect.objectContaining({ assetId: 'a1' }),
      );
    });

    it('bulkAssign records a TRANSFERRED history event with the manager', async () => {
      await service.bulkAssign({ ids: ['a1'], userId: 'u9' } as never, 'actor-1');

      expect(history.record).toHaveBeenCalledWith(
        expect.objectContaining({
          assetId: 'a1',
          action: AssetHistoryAction.TRANSFERRED,
          newValue: { assignedToUserId: 'u9', departmentId: 'd1' },
        }),
        manager,
      );
    });

    it('bulkDelete records a history event with the manager', async () => {
      await service.bulkDelete({ ids: ['a1'] } as never, 'actor-1');

      expect(manager.softRemove).toHaveBeenCalled();
      expect(history.record).toHaveBeenCalledWith(
        expect.objectContaining({ assetId: 'a1', performedById: 'actor-1' }),
        manager,
      );
    });

    it('records no history and emits nothing for a failed bulk item', async () => {
      manager.findOne.mockResolvedValue(null);

      const result = await service.bulkStatus(
        { ids: ['missing'], status: AssetStatus.IN_MAINTENANCE } as never,
      );

      expect(result.failed).toEqual([{ id: 'missing', reason: 'Asset not found' }]);
      expect(history.record).not.toHaveBeenCalled();
      expect(emitter.emit).not.toHaveBeenCalled();
    });

    it('emits nothing for a bulk item whose transaction rolls back', async () => {
      rollback();

      await expect(
        service.bulkStatus({ ids: ['a1'], status: AssetStatus.IN_MAINTENANCE } as never),
      ).rejects.toThrow('commit failed');

      expect(emitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('AssetLifecycleService', () => {
    it('no longer keeps history in process memory', () => {
      const instance = lifecycle as unknown as Record<string, unknown>;
      expect(instance.history).toBeUndefined();
      expect(instance.recordHistory).toBeUndefined();
      expect(instance.getHistory).toBeUndefined();
    });
  });
});
