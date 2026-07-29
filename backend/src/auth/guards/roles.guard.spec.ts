import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const createMockContext = (user: { role: string }) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('should allow access for ADMIN role on ADMIN route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const context = createMockContext({ role: 'ADMIN' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should block USER role on ADMIN route with ForbiddenException (403)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const context = createMockContext({ role: 'USER' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow MANAGER role on MANAGER route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['MANAGER']);
    const context = createMockContext({ role: 'MANAGER' });

    expect(guard.canActivate(context)).toBe(true);
  });
});
