import { UsersService } from './users/users.service';
import { UserRole } from './users/entities/user.entity';
import { HealthController } from './health/health.controller';

describe('kike-alt Modules (BE-79, BE-78, BE-77, BE-76)', () => {
  it('UsersService creates and sanitizes user without returning passwordHash', async () => {
    const mockRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((dto) => Promise.resolve({ id: 'u-1', ...dto })),
    };
    const service = new UsersService(mockRepo as any);

    const user = await service.create({
      email: 'user@example.com',
      password: 'secret-password',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.EMPLOYEE,
    });

    expect(user.id).toBe('u-1');
    expect(user.email).toBe('user@example.com');
    expect((user as any).passwordHash).toBeUndefined();
  });

  it('UsersService refuses self role change', async () => {
    const service = new UsersService({} as any);
    await expect(service.updateRole('u-1', UserRole.ADMIN, 'u-1')).rejects.toThrow('Cannot change your own role');
  });

  it('HealthController returns liveness and readiness status', () => {
    const controller = new HealthController();
    const live = controller.getLiveness();
    const ready = controller.getReadiness();

    expect(live.status).toBe('ok');
    expect(ready.status).toBe('ok');
    expect(ready.checks.database).toBe('up');
  });
});
