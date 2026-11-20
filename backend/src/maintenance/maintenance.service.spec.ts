import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceStatus } from './entities/maintenance-record.entity';
import { AssetStatus } from '../assets/asset-lifecycle.service';

function build(options: {
  record?: any;
  asset?: any;
  otherInProgress?: number;
}) {
  const record = options.record ?? {
    id: 'm-1',
    assetId: 'ast-1',
    status: MaintenanceStatus.SCHEDULED,
  };
  const asset = options.asset ?? { id: 'ast-1', status: AssetStatus.AVAILABLE };
  const repo: any = {
    findOne: jest.fn().mockResolvedValue(record),
    create: jest.fn((d) => d),
    save: jest.fn((r) => Promise.resolve(r)),
    createQueryBuilder: jest.fn(() => {
      const qb: any = {
        where: jest.fn(() => qb),
        andWhere: jest.fn(() => qb),
        getCount: jest.fn().mockResolvedValue(options.otherInProgress ?? 0),
      };
      return qb;
    }),
  };
  const assets: any = {
    findById: jest.fn().mockImplementation(() => Promise.resolve(asset)),
    updateStatus: jest.fn().mockResolvedValue(undefined),
  };
  return { service: new MaintenanceService(repo, assets), repo, assets, record };
}

describe('MaintenanceService.updateStatus', () => {
  it('returns 404 when the record belongs to a different asset', async () => {
    const { service, repo } = build({});
    await expect(
      service.updateStatus('m-1', MaintenanceStatus.COMPLETED, 'other-asset'),
    ).rejects.toThrow(NotFoundException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('accepts the matching asset id', async () => {
    const { service } = build({});
    await expect(
      service.updateStatus('m-1', MaintenanceStatus.CANCELLED, 'ast-1'),
    ).resolves.toBeDefined();
  });

  it('moves the asset to IN_MAINTENANCE when maintenance starts', async () => {
    const { service, assets, repo } = build({});
    await service.updateStatus('m-1', MaintenanceStatus.IN_PROGRESS);
    expect(assets.updateStatus).toHaveBeenCalledWith(
      'ast-1',
      expect.objectContaining({ status: 'IN_MAINTENANCE' }),
    );
    expect(repo.save).toHaveBeenCalled();
  });

  it('leaves the record unchanged when the asset cannot enter maintenance', async () => {
    const { service, assets, repo } = build({});
    assets.updateStatus.mockRejectedValue(new BadRequestException('not allowed'));
    await expect(
      service.updateStatus('m-1', MaintenanceStatus.IN_PROGRESS),
    ).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it.each([MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED])(
    'restores an unassigned asset to AVAILABLE when an in-progress record becomes %s',
    async (status) => {
      const { service, assets } = build({
        record: { id: 'm-1', assetId: 'ast-1', status: MaintenanceStatus.IN_PROGRESS },
        asset: { id: 'ast-1', status: AssetStatus.IN_MAINTENANCE, assignedToUserId: null },
      });
      await service.updateStatus('m-1', status);
      expect(assets.updateStatus).toHaveBeenCalledWith(
        'ast-1',
        expect.objectContaining({ status: 'AVAILABLE' }),
      );
    },
  );

  it('restores an assigned asset to ASSIGNED', async () => {
    const { service, assets } = build({
      record: { id: 'm-1', assetId: 'ast-1', status: MaintenanceStatus.IN_PROGRESS },
      asset: { id: 'ast-1', status: AssetStatus.IN_MAINTENANCE, assignedToUserId: 'u-1' },
    });
    await service.updateStatus('m-1', MaintenanceStatus.COMPLETED);
    expect(assets.updateStatus).toHaveBeenCalledWith(
      'ast-1',
      expect.objectContaining({ status: 'ASSIGNED' }),
    );
  });

  it('keeps the asset in maintenance while another record is still in progress', async () => {
    const { service, assets } = build({
      record: { id: 'm-1', assetId: 'ast-1', status: MaintenanceStatus.IN_PROGRESS },
      asset: { id: 'ast-1', status: AssetStatus.IN_MAINTENANCE },
      otherInProgress: 1,
    });
    await service.updateStatus('m-1', MaintenanceStatus.COMPLETED);
    expect(assets.updateStatus).not.toHaveBeenCalled();
  });

  it('does not touch an asset that has already moved on (for example retired)', async () => {
    const { service, assets } = build({
      record: { id: 'm-1', assetId: 'ast-1', status: MaintenanceStatus.IN_PROGRESS },
      asset: { id: 'ast-1', status: AssetStatus.RETIRED },
    });
    await service.updateStatus('m-1', MaintenanceStatus.COMPLETED);
    expect(assets.updateStatus).not.toHaveBeenCalled();
  });

  it('does not change the asset when a scheduled record is cancelled', async () => {
    const { service, assets } = build({});
    await service.updateStatus('m-1', MaintenanceStatus.CANCELLED);
    expect(assets.updateStatus).not.toHaveBeenCalled();
  });
});

describe('MaintenanceService.create asset checks', () => {
  it('rejects an unknown asset', async () => {
    const { service, assets } = build({});
    assets.findById.mockRejectedValue(new NotFoundException('Asset x not found'));
    await expect(
      service.create({ assetId: 'x', title: 'Fix' } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects a disposed asset', async () => {
    const { service, repo } = build({
      asset: { id: 'ast-1', status: AssetStatus.DISPOSED },
    });
    await expect(
      service.create({ assetId: 'ast-1', title: 'Fix' } as any),
    ).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('creates a record for a live asset', async () => {
    const { service, repo } = build({});
    await service.create({ assetId: 'ast-1', title: 'Fix' } as any);
    expect(repo.save).toHaveBeenCalled();
  });
});
