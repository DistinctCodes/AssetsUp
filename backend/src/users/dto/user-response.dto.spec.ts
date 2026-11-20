import { User, UserRole } from '../entities/user.entity';
import { UsersService } from '../users.service';
import { toUserResponse, UserResponseDto } from './user-response.dto';

const SECRET_FIELDS = [
  'passwordHash',
  'refreshTokenHash',
  'passwordResetToken',
  'passwordResetExpires',
];

function fullUser(): User {
  return {
    id: 'u1',
    email: 'a@example.com',
    passwordHash: 'bcrypt-hash',
    firstName: 'Ada',
    lastName: 'Lovelace',
    role: UserRole.MANAGER,
    departmentId: 'd1',
    branchId: 'b1',
    avatarUrl: 'https://example.com/a.png',
    isActive: true,
    lastLoginAt: new Date('2026-01-02T00:00:00Z'),
    refreshTokenHash: 'refresh-hash',
    passwordResetToken: 'reset-hash',
    passwordResetExpires: new Date('2026-02-01T00:00:00Z'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-03T00:00:00Z'),
  } as User;
}

describe('toUserResponse', () => {
  it('copies exactly the public fields', () => {
    const response = toUserResponse(fullUser());

    expect(response).toBeInstanceOf(UserResponseDto);
    expect(Object.keys(response).sort()).toEqual(
      [
        'avatarUrl',
        'branchId',
        'createdAt',
        'departmentId',
        'email',
        'firstName',
        'id',
        'isActive',
        'lastLoginAt',
        'lastName',
        'role',
        'updatedAt',
      ].sort(),
    );
    expect(response.email).toBe('a@example.com');
    expect(response.role).toBe(UserRole.MANAGER);
  });

  it('never exposes a secret column, including the reset token and its expiry', () => {
    const response = toUserResponse(fullUser()) as unknown as Record<
      string,
      unknown
    >;
    for (const field of SECRET_FIELDS) {
      expect(response).not.toHaveProperty(field);
    }
    expect(JSON.stringify(response)).not.toMatch(/hash|reset/i);
  });

  it('does not leak a column that was added to the entity later', () => {
    const user = { ...fullUser(), futureSecret: 'x' } as unknown as User;
    expect(toUserResponse(user)).not.toHaveProperty('futureSecret');
  });
});

describe('UsersService.sanitize', () => {
  it('returns the allow-listed response, without reset-token fields', () => {
    const service = new UsersService({} as never);
    const result = service.sanitize(fullUser()) as unknown as Record<
      string,
      unknown
    >;

    for (const field of SECRET_FIELDS) {
      expect(result).not.toHaveProperty(field);
    }
    expect(result.id).toBe('u1');
  });
});
