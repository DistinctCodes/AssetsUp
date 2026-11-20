import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRole } from '../users/entities/user.entity';

const user = (over: Record<string, unknown> = {}) => ({
  id: 'u-1',
  email: 'a@b.com',
  firstName: 'A',
  lastName: 'B',
  role: UserRole.EMPLOYEE,
  passwordHash: 'hash',
  isActive: true,
  refreshTokenHash: 'stored',
  ...over,
});

function build(found: any) {
  const users: any = {
    findByEmail: jest.fn().mockResolvedValue(found),
    findById: jest.fn().mockResolvedValue(found),
    setRefreshTokenHash: jest.fn().mockResolvedValue(undefined),
    setLastLogin: jest.fn().mockResolvedValue(undefined),
  };
  const jwt: any = {
    sign: jest.fn().mockReturnValue('signed'),
    verify: jest.fn(),
    decode: jest.fn(),
  };
  const config: any = { get: jest.fn((_k: string, d?: string) => d ?? 'secret') };
  const passwords: any = { compare: jest.fn().mockResolvedValue(true), hash: jest.fn() };
  const service = new AuthService(users, jwt, config, undefined, passwords);
  return { service, users, jwt };
}

describe('AuthService.login', () => {
  it('records lastLoginAt on success', async () => {
    const { service, users } = build(user());
    await service.login({ email: 'a@b.com', password: 'pw' });
    expect(users.setLastLogin).toHaveBeenCalledWith('u-1');
  });

  it('rejects a deactivated user and issues no tokens', async () => {
    const { service, users } = build(user({ isActive: false }));
    await expect(service.login({ email: 'a@b.com', password: 'pw' })).rejects.toThrow(
      UnauthorizedException,
    );
    expect(users.setRefreshTokenHash).not.toHaveBeenCalled();
    expect(users.setLastLogin).not.toHaveBeenCalled();
  });

  it('does not reveal the account status when the password is wrong', async () => {
    const { service } = build(user({ isActive: false }));
    (service as any).passwords.compare.mockResolvedValue(false);
    await expect(service.login({ email: 'a@b.com', password: 'bad' })).rejects.toThrow(
      'Invalid credentials',
    );
  });
});

describe('AuthService.refreshToken', () => {
  it('rejects a deactivated user and revokes the stored session', async () => {
    const { service, users, jwt } = build(user({ isActive: false }));
    jwt.verify.mockReturnValue({ sub: 'u-1', jti: 'j-1', exp: 9999999999 });

    await expect(service.refreshToken('token')).rejects.toThrow(
      /deactivated/,
    );
    expect(users.setRefreshTokenHash).toHaveBeenCalledWith('u-1', null);
  });

  it('rejects when the session was revoked (password change clears the hash)', async () => {
    const { service, jwt } = build(user({ refreshTokenHash: null }));
    jwt.verify.mockReturnValue({ sub: 'u-1', jti: 'j-1', exp: 9999999999 });
    await expect(service.refreshToken('token')).rejects.toThrow(/revoked/);
  });
});

describe('AuthService.logout', () => {
  it('adds the presented refresh token jti to the revocation list, so it cannot be refreshed', async () => {
    const { service, jwt, users } = build(user());
    jwt.decode.mockReturnValue({ sub: 'u-1', jti: 'j-1', exp: 9999999999 });

    await service.logout('u-1', 'refresh-token');

    expect((service as any).revokedRefreshTokenJtis.has('j-1')).toBe(true);
    expect(users.setRefreshTokenHash).toHaveBeenCalledWith('u-1', null);

    jwt.verify.mockReturnValue({ sub: 'u-1', jti: 'j-1', exp: 9999999999 });
    await expect(service.refreshToken('refresh-token')).rejects.toThrow(/revoked/);
  });

  it("ignores a refresh token that belongs to someone else", async () => {
    const { service, jwt } = build(user());
    jwt.decode.mockReturnValue({ sub: 'someone-else', jti: 'j-9', exp: 9999999999 });
    await service.logout('u-1', 'their-token');
    expect((service as any).revokedRefreshTokenJtis.has('j-9')).toBe(false);
  });

  it('still logs out without a refresh token', async () => {
    const { service, users } = build(user());
    await expect(service.logout('u-1')).resolves.toEqual({ message: 'Logged out successfully' });
    expect(users.setRefreshTokenHash).toHaveBeenCalledWith('u-1', null);
  });
});
