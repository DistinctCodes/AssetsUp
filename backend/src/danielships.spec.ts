import { AuthService } from './auth/auth.service';
import { BranchesService } from './branches/branches.service';
import { DepartmentsService } from './departments/departments.service';

describe('danielships Modules (BE-83, BE-82, BE-81, BE-80)', () => {
  it('AuthService registers and logins user', async () => {
    const jwtMock = { sign: jest.fn().mockReturnValue('mock-jwt') };
    const authService = new AuthService(jwtMock as any);

    const registered = await authService.register({
      email: 'new@example.com',
      password: 'password123',
      firstName: 'Daniel',
      lastName: 'Ship',
    });

    expect(registered.accessToken).toBe('mock-jwt');
    expect(registered.user.email).toBe('new@example.com');
  });

  it('BranchesService creates branch', async () => {
    const repoMock = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((dto) => Promise.resolve({ id: 'b-1', ...dto })),
    };
    const service = new BranchesService(repoMock as any);
    const branch = await service.create({ name: 'HQ', code: 'MAIN' });
    expect(branch.name).toBe('HQ');
  });

  it('DepartmentsService prevents self-parenting', async () => {
    const repoMock = { findOne: jest.fn().mockResolvedValue({ id: 'd-1', name: 'IT' }) };
    const service = new DepartmentsService(repoMock as any);

    await expect(service.update('d-1', { parentDepartmentId: 'd-1' })).rejects.toThrow(
      'A department cannot be its own parent',
    );
  });
});
