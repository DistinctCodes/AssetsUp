import { WsException } from '@nestjs/websockets';
import { EventsGateway } from './events.gateway';
import { UserRole } from '../users/entities/user.entity';

type FakeSocket = ReturnType<typeof socket>;

function socket(userId?: string) {
  const rooms = new Set<string>();
  return {
    id: `sock-${userId ?? 'anon'}`,
    data: {} as Record<string, any>,
    handshake: { headers: { authorization: userId ? `Bearer tok-${userId}` : undefined }, query: {} },
    rooms,
    join: jest.fn((room: string) => void rooms.add(room)),
    leave: jest.fn((room: string) => void rooms.delete(room)),
    disconnect: jest.fn(),
  };
}

/** A server whose `.to(room).emit(event, payload)` records which room got what. */
function fakeServer() {
  const emitted: Array<{ room: string; event: string; payload: unknown }> = [];
  return {
    emitted,
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => emitted.push({ room, event, payload }),
    }),
  };
}

function build(users: Record<string, any>, assets: Record<string, any> = {}) {
  const jwt: any = {
    verify: jest.fn((token: string) => ({ sub: token.replace('tok-', '') })),
  };
  const config: any = { get: jest.fn((_k: string, d?: string) => d) };
  const userRepo: any = { findOne: jest.fn(({ where: { id } }) => Promise.resolve(users[id] ?? null)) };
  const assetRepo: any = { findOne: jest.fn(({ where: { id } }) => Promise.resolve(assets[id] ?? null)) };
  const gateway = new EventsGateway(config, jwt, userRepo, assetRepo);
  gateway.server = fakeServer() as any;
  return { gateway, server: gateway.server as any as ReturnType<typeof fakeServer> };
}

const clientOf = (s: FakeSocket) => s as any;

describe('EventsGateway rooms', () => {
  it('joins the user room and the department room on connect', async () => {
    const { gateway } = build({ u1: { id: 'u1', departmentId: 'D', role: UserRole.EMPLOYEE } });
    const s = socket('u1');
    await gateway.handleConnection(clientOf(s));
    expect([...s.rooms].sort()).toEqual(['department:D', 'user:u1']);
  });

  it('joins only the user room when the user has no department', async () => {
    const { gateway } = build({ u1: { id: 'u1', role: UserRole.EMPLOYEE } });
    const s = socket('u1');
    await gateway.handleConnection(clientOf(s));
    expect([...s.rooms]).toEqual(['user:u1']);
  });

  it('rejects a connection without a token', async () => {
    const { gateway } = build({});
    const s = socket();
    await expect(gateway.handleConnection(clientOf(s))).rejects.toThrow(WsException);
    expect(s.disconnect).toHaveBeenCalledWith(true);
  });

  it('delivers an asset status change to a connected client in the same department', async () => {
    const { gateway, server } = build({ u1: { id: 'u1', departmentId: 'D', role: UserRole.EMPLOYEE } });
    const inD = socket('u1');
    await gateway.handleConnection(clientOf(inD));

    gateway.emitAssetStatusChanged({
      assetId: 'a1',
      departmentId: 'D',
      previousStatus: 'AVAILABLE',
      newStatus: 'IN_MAINTENANCE',
    });

    const rooms = server.emitted.filter((e) => e.event === 'asset.status_changed').map((e) => e.room);
    expect(rooms).toContain('department:D');
    // The room the event went to is one the client is actually in.
    expect(inD.rooms.has('department:D')).toBe(true);
  });

  it('delivers maintenance.due to the department room', () => {
    const { gateway, server } = build({});
    gateway.emitMaintenanceDue({
      maintenanceId: 'm1',
      assetId: 'a1',
      departmentId: 'D',
      title: 'Service',
      scheduledDate: '2026-01-01',
    });
    expect(server.emitted.map((e) => e.room)).toEqual(['department:D', 'asset:a1']);
  });
});

describe('EventsGateway asset subscriptions', () => {
  const users = {
    emp: { id: 'emp', departmentId: 'D', role: UserRole.EMPLOYEE },
    other: { id: 'other', departmentId: 'X', role: UserRole.EMPLOYEE },
    mgr: { id: 'mgr', departmentId: 'X', role: UserRole.MANAGER },
  };
  const assets = {
    a1: { id: 'a1', departmentId: 'D', assignedToUserId: null },
    a2: { id: 'a2', departmentId: 'Y', assignedToUserId: 'other' },
  };

  async function connected(userId: keyof typeof users) {
    const { gateway, server } = build(users, assets);
    const s = socket(userId);
    await gateway.handleConnection(clientOf(s));
    return { gateway, server, s };
  }

  it('lets someone in the asset department subscribe, and then receive its events', async () => {
    const { gateway, server, s } = await connected('emp');
    await expect(gateway.subscribeAsset(clientOf(s), { assetId: 'a1' })).resolves.toEqual({
      event: 'subscribed',
      data: { assetId: 'a1' },
    });
    expect(s.rooms.has('asset:a1')).toBe(true);

    gateway.emitAssetStatusChanged({ assetId: 'a1', previousStatus: 'AVAILABLE', newStatus: 'ASSIGNED' });
    expect(server.emitted.map((e) => e.room)).toContain('asset:a1');
  });

  it('lets the assignee subscribe even from another department', async () => {
    const { gateway, s } = await connected('other');
    await gateway.subscribeAsset(clientOf(s), { assetId: 'a2' });
    expect(s.rooms.has('asset:a2')).toBe(true);
  });

  it('lets a manager subscribe to any asset', async () => {
    const { gateway, s } = await connected('mgr');
    await gateway.subscribeAsset(clientOf(s), { assetId: 'a1' });
    expect(s.rooms.has('asset:a1')).toBe(true);
  });

  it('refuses an unrelated employee', async () => {
    const { gateway, s } = await connected('other');
    await expect(gateway.subscribeAsset(clientOf(s), { assetId: 'a1' })).rejects.toThrow(
      'Not allowed to watch this asset',
    );
    expect(s.rooms.has('asset:a1')).toBe(false);
  });

  it('rejects a missing asset id and an unknown asset', async () => {
    const { gateway, s } = await connected('mgr');
    await expect(gateway.subscribeAsset(clientOf(s), {})).rejects.toThrow('assetId is required');
    await expect(gateway.subscribeAsset(clientOf(s), { assetId: 'nope' })).rejects.toThrow(
      'Asset not found',
    );
  });

  it('unsubscribe leaves the asset room', async () => {
    const { gateway, s } = await connected('mgr');
    await gateway.subscribeAsset(clientOf(s), { assetId: 'a1' });
    gateway.unsubscribeAsset(clientOf(s), { assetId: 'a1' });
    expect(s.rooms.has('asset:a1')).toBe(false);
  });
});
