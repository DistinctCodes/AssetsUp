import { ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';

function build(user: any) {
  const repo: any = {
    findOne: jest.fn().mockResolvedValue(user),
    save: jest.fn((u) => Promise.resolve(u)),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const audit = { logAction: jest.fn().mockResolvedValue(undefined) };
  const passwords: any = {
    compare: jest.fn().mockResolvedValue(true),
    hash: jest.fn().mockResolvedValue('new-hash'),
  };
  return { service: new UsersService(repo, audit as any, passwords), repo, audit };
}

const activeUser = () => ({
  id: 'u-1',
  email: 'a@b.com',
  isActive: true,
  passwordHash: 'old-hash',
  refreshTokenHash: 'live-session',
});

describe('UsersService.setActive', () => {
  it('clears the refresh token and audits a deactivation', async () => {
    const { service, repo, audit } = build(activeUser());
    await service.setActive('u-1', false, 'admin-1');

    const saved = repo.save.mock.calls[0][0];
    expect(saved.isActive).toBe(false);
    expect(saved.refreshTokenHash).toBeNull();
    expect(audit.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_DEACTIVATED',
        entityId: 'u-1',
        actorId: 'admin-1',
        previousValue: { isActive: true },
        newValue: { isActive: false },
      }),
    );
  });

  it('audits an activation and keeps an existing session untouched', async () => {
    const { service, repo, audit } = build({ ...activeUser(), isActive: false, refreshTokenHash: null });
    await service.setActive('u-1', true, 'admin-1');

    expect(repo.save.mock.calls[0][0].isActive).toBe(true);
    expect(audit.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'USER_ACTIVATED' }),
    );
  });

  it('writes no audit entry when nothing changed', async () => {
    const { service, audit } = build(activeUser());
    await service.setActive('u-1', true, 'admin-1');
    expect(audit.logAction).not.toHaveBeenCalled();
  });

  it('still refuses self-deactivation', async () => {
    const { service } = build(activeUser());
    await expect(service.setActive('u-1', false, 'u-1')).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('UsersService.updateMe', () => {
  it('revokes the refresh token when the password changes', async () => {
    const { service, repo } = build(activeUser());
    await service.updateMe('u-1', {
      currentPassword: 'old',
      newPassword: 'Newpassword1!',
    });
    const saved = repo.save.mock.calls[0][0];
    expect(saved.passwordHash).toBe('new-hash');
    expect(saved.refreshTokenHash).toBeNull();
  });

  it('keeps the session when only the name changes', async () => {
    const { service, repo } = build(activeUser());
    await service.updateMe('u-1', { firstName: 'Jane' });
    expect(repo.save.mock.calls[0][0].refreshTokenHash).toBe('live-session');
  });
});

describe('UsersService.setLastLogin', () => {
  it('stores the login time', async () => {
    const { service, repo } = build(activeUser());
    const at = new Date('2026-01-01T00:00:00Z');
    await service.setLastLogin('u-1', at);
    expect(repo.update).toHaveBeenCalledWith('u-1', { lastLoginAt: at });
  });
});
