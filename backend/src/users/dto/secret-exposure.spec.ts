import { instanceToPlain } from 'class-transformer';
import { AssetsService } from '../../assets/assets.service';
import { AssetHistoryService } from '../../assets/asset-history.service';
import { ReservationsService } from '../../reservations/reservations.service';
import { User, UserRole } from '../entities/user.entity';
import { toPublicUserRef } from './public-user.dto';

/**
 * Regression tests for secret columns leaking through user relations: asset
 * detail (`assignedTo`), asset history (`performedBy`) and reservations
 * (`reservedBy`). None of those payloads may contain a password hash, a refresh
 * token hash or a password-reset token.
 */
const SECRETS = ['passwordHash', 'refreshTokenHash', 'passwordResetToken', 'passwordResetExpires'];

function fullUser(): User {
  return Object.assign(new User(), {
    id: 'u1',
    email: 'ada@example.com',
    passwordHash: '$2b$10$bcrypt',
    firstName: 'Ada',
    lastName: 'Lovelace',
    role: UserRole.MANAGER,
    isActive: true,
    refreshTokenHash: 'refresh-hash',
    passwordResetToken: 'reset-hash',
    passwordResetExpires: new Date('2026-02-01T00:00:00Z'),
  });
}

function expectNoSecrets(payload: unknown) {
  const text = JSON.stringify(payload);
  for (const secret of SECRETS) expect(text).not.toContain(secret);
  expect(text).not.toContain('$2b$10$bcrypt');
  expect(text).not.toContain('refresh-hash');
  expect(text).not.toContain('reset-hash');
}

describe('toPublicUserRef', () => {
  it('keeps only id, names and email', () => {
    expect(toPublicUserRef(fullUser())).toEqual({
      id: 'u1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
    });
  });

  it('maps a missing user to null', () => {
    expect(toPublicUserRef(null)).toBeNull();
    expect(toPublicUserRef(undefined)).toBeNull();
  });
});

describe('User entity serialization rules', () => {
  it('excludes every secret column when the entity is serialized', () => {
    const plain = instanceToPlain(fullUser());

    for (const secret of SECRETS) expect(plain).not.toHaveProperty(secret);
    expect(plain.email).toBe('ada@example.com');
  });
});

describe('asset detail', () => {
  it('returns the assignee as a public user ref only', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'a1',
        name: 'Laptop',
        assignedTo: fullUser(),
      }),
    };
    const service = new AssetsService(
      repo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const detail = await service.findDetail('a1');

    expect(detail.assignedTo).toEqual({
      id: 'u1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
    });
    expectNoSecrets(detail);
  });

  it('keeps assignedTo null for an unassigned asset', async () => {
    const repo = { findOne: jest.fn().mockResolvedValue({ id: 'a1', assignedTo: null }) };
    const service = new AssetsService(
      repo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    expect((await service.findDetail('a1')).assignedTo).toBeNull();
  });
});

describe('asset history', () => {
  it('returns performedBy as a public user ref only', async () => {
    const repo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'h1',
          assetId: 'a1',
          description: 'Status changed',
          performedBy: fullUser(),
          createdAt: new Date(),
        },
        { id: 'h2', assetId: 'a1', description: 'System event', performedBy: null },
      ]),
    };
    const service = new AssetHistoryService(repo as never);

    const result = await service.findByAsset('a1');

    expect(result.data[0].performedBy).toEqual({
      id: 'u1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
    });
    expect(result.data[1].performedBy).toBeNull();
    expectNoSecrets(result);
  });
});

describe('reservations', () => {
  it('selects only the public columns of the reserving user', async () => {
    const qb: Record<string, jest.Mock> = {};
    for (const m of ['leftJoinAndSelect', 'leftJoin', 'addSelect', 'andWhere', 'orderBy']) {
      qb[m] = jest.fn(() => qb);
    }
    qb.getMany = jest.fn().mockResolvedValue([]);
    const repo = { createQueryBuilder: jest.fn(() => qb) };
    const service = new ReservationsService(repo as never, {} as never, {} as never);

    await service.findAll({});

    expect(qb.leftJoin).toHaveBeenCalledWith('r.reservedBy', 'reservedBy');
    expect(qb.addSelect).toHaveBeenCalledWith([
      'reservedBy.id',
      'reservedBy.firstName',
      'reservedBy.lastName',
      'reservedBy.email',
    ]);
    // The full-entity join must be gone for the user relation.
    expect(qb.leftJoinAndSelect).not.toHaveBeenCalledWith('r.reservedBy', 'reservedBy');
  });
});
