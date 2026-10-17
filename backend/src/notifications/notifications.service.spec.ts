import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

function build() {
  const repo: any = {
    findOne: jest.fn(),
    save: jest.fn(async (n) => n),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    count: jest.fn().mockResolvedValue(3),
    update: jest.fn().mockResolvedValue({ affected: 2 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  return { repo, svc: new NotificationsService(repo, { emit: jest.fn() } as any) };
}

describe('NotificationsService (per-user scoping)', () => {
  it('lists only the caller\'s notifications, newest first, with a clamped limit', async () => {
    const { repo, svc } = build();
    await svc.findPage('u-1', { page: 2, limit: 5000 });
    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u-1' }, skip: 100, take: 100 }),
    );
  });

  it('filters unread only', async () => {
    const { repo, svc } = build();
    await svc.findPage('u-1', { unreadOnly: true });
    expect(repo.findAndCount.mock.calls[0][0].where).toEqual({
      userId: 'u-1',
      isRead: false,
    });
  });

  it('counts only the caller\'s unread notifications', async () => {
    const { repo, svc } = build();
    await expect(svc.unreadCount('u-1')).resolves.toEqual({ count: 3 });
    expect(repo.count).toHaveBeenCalledWith({
      where: { userId: 'u-1', isRead: false },
    });
  });

  it('marks own notification read, scoping the lookup by user', async () => {
    const { repo, svc } = build();
    repo.findOne.mockResolvedValue({ id: 'n-1', userId: 'u-1', isRead: false });
    const result = await svc.markOwnAsRead('n-1', 'u-1');
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 'n-1', userId: 'u-1' },
    });
    expect(result.isRead).toBe(true);
  });

  it('404s when marking or deleting someone else\'s notification', async () => {
    const { repo, svc } = build();
    repo.findOne.mockResolvedValue(null);
    await expect(svc.markOwnAsRead('n-1', 'intruder')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    repo.delete.mockResolvedValue({ affected: 0 });
    await expect(svc.removeOwn('n-1', 'intruder')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.delete).toHaveBeenCalledWith({ id: 'n-1', userId: 'intruder' });
  });

  it('marks all of the caller\'s unread notifications read', async () => {
    const { repo, svc } = build();
    await expect(svc.markAllAsRead('u-1')).resolves.toEqual({ updated: 2 });
    expect(repo.update).toHaveBeenCalledWith(
      { userId: 'u-1', isRead: false },
      { isRead: true },
    );
  });
});
