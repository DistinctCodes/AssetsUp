import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../users/entities/user.entity';

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createContext(user: Record<string, unknown> | undefined): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => () => undefined,
    } as unknown as ExecutionContext;
  }

  it('allows access when no roles are required', () => {
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);
    const context = createContext({ role: UserRole.VIEWER });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows ADMIN for ADMIN-protected routes', () => {
    jest.spyOn(reflector, 'get').mockReturnValue([UserRole.ADMIN]);
    const context = createContext({ role: UserRole.ADMIN });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows MANAGER for ADMIN or MANAGER routes', () => {
    jest.spyOn(reflector, 'get').mockReturnValue([UserRole.ADMIN, UserRole.MANAGER]);
    const context = createContext({ role: UserRole.MANAGER });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('forbids VIEWER for ADMIN-only routes', () => {
    jest.spyOn(reflector, 'get').mockReturnValue([UserRole.ADMIN]);
    const context = createContext({ role: UserRole.VIEWER });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
