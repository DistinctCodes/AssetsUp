import { TransfersService } from '../transfers/transfers.service';
import { ReservationsService } from '../reservations/reservations.service';
import { LicensesService } from '../licenses/licenses.service';

describe('domain services emit the events that create notifications', () => {
  it('TransfersService emits requested, approved and rejected', async () => {
    const events = { emit: jest.fn() };
    const pending = { id: 't-1', status: 'PENDING', assetId: 'a-1', toDepartmentId: 'd-2' };
    const repo: any = {
      create: jest.fn((d) => d),
      save: jest.fn((d) => Promise.resolve({ id: 't-1', ...d })),
      findOne: jest.fn().mockResolvedValue({ ...pending }),
      manager: { transaction: jest.fn(async (fn) => fn({ save: jest.fn(), findOneBy: jest.fn() })) },
    };
    const service = new TransfersService(repo, {} as any, events as any);

    await service.create({ assetId: 'a-1', requestedByUserId: 'u-1' });
    await service.approve('t-1', 'mgr');
    repo.findOne.mockResolvedValue({ ...pending });
    await service.reject('t-1', 'No');

    expect(events.emit.mock.calls.map((c) => c[0])).toEqual([
      'transfer.requested',
      'transfer.approved',
      'transfer.rejected',
    ]);
  });

  it('ReservationsService emits confirmed and cancelled', async () => {
    const events = { emit: jest.fn() };
    const reservation = { id: 'r-1', status: 'PENDING', reservedByUserId: 'owner' };
    const repo: any = {
      findOneBy: jest.fn().mockImplementation(() => Promise.resolve({ ...reservation })),
      save: jest.fn((r) => Promise.resolve(r)),
    };
    const service = new ReservationsService(repo, {} as any, {} as any, events as any);

    await service.confirm('r-1', 'MANAGER');
    await service.cancel('r-1', 'owner', 'EMPLOYEE', 'changed my mind');

    expect(events.emit).toHaveBeenCalledWith('reservation.confirmed', expect.anything());
    expect(events.emit).toHaveBeenCalledWith(
      'reservation.cancelled',
      expect.objectContaining({ actorId: 'owner' }),
    );
  });

  it('LicensesService emits license.seat_assigned after the seat is saved', async () => {
    const events = { emit: jest.fn() };
    const license = { id: 'l-1', name: 'Figma', seatsUsed: 0, seatsTotal: 5 };
    const manager = {
      findOne: jest.fn().mockResolvedValueOnce(license).mockResolvedValueOnce(null),
      create: jest.fn((_e, d) => d),
      save: jest.fn(),
    };
    const dataSource: any = { transaction: jest.fn((fn) => fn(manager)) };
    const licenseRepo: any = { findOne: jest.fn().mockResolvedValue(license) };
    const service = new LicensesService(licenseRepo, {} as any, dataSource, events as any);

    await service.assign('l-1', { userId: 'u-9' });

    expect(events.emit).toHaveBeenCalledWith('license.seat_assigned', {
      licenseId: 'l-1',
      licenseName: 'Figma',
      userId: 'u-9',
    });
  });

  it('works without an event emitter (older construction)', async () => {
    const repo: any = {
      create: jest.fn((d) => d),
      save: jest.fn((d) => Promise.resolve(d)),
    };
    const service = new TransfersService(repo, {} as any);
    await expect(service.create({ assetId: 'a' })).resolves.toBeDefined();
  });
});
