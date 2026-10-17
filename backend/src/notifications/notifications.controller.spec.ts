import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsController } from './notifications.controller';

describe('NotificationsController', () => {
  it('requires JWT authentication for every route', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, NotificationsController),
    ).toContain(JwtAuthGuard);
  });

  it('passes the authenticated user id to the service, never a client id', async () => {
    const service: any = {
      findPage: jest.fn().mockResolvedValue({ items: [] }),
      markOwnAsRead: jest.fn(),
    };
    const controller = new NotificationsController(service);
    await controller.list('u-1', { unreadOnly: true });
    expect(service.findPage).toHaveBeenCalledWith('u-1', { unreadOnly: true });
    controller.read('3b241101-e2bb-4255-8caf-4136c566a962', 'u-1');
    expect(service.markOwnAsRead).toHaveBeenCalledWith(
      '3b241101-e2bb-4255-8caf-4136c566a962',
      'u-1',
    );
  });
});
