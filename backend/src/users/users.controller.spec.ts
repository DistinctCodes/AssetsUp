import { UnauthorizedException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController.getProfile', () => {
  const user = { id: 'u-1', email: 'a@b.com' };
  const service = {
    findById: jest.fn().mockResolvedValue(user),
    sanitize: jest.fn((u) => u),
  } as unknown as UsersService;
  const controller = new UsersController(service);

  beforeEach(() => jest.clearAllMocks());

  it('returns the sanitised profile for the authenticated user', async () => {
    await expect(controller.getProfile('u-1')).resolves.toEqual(user);
    expect(service.findById).toHaveBeenCalledWith('u-1');
  });

  it.each([undefined, ''])(
    'throws 401 instead of inventing an identity when the user id is %p',
    async (id) => {
      await expect(controller.getProfile(id)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(service.findById).not.toHaveBeenCalled();
    },
  );
});
