import { NotificationEventsListener } from './notification-events.listener';
import { NotificationType } from './entities/notification.entity';
import { UserRole } from '../users/entities/user.entity';

function build(users: Array<{ id: string }> = []) {
  const notifications = { create: jest.fn().mockResolvedValue({}) };
  const userRepo = { find: jest.fn().mockResolvedValue(users) };
  return {
    listener: new NotificationEventsListener(notifications as any, userRepo as any),
    notifications,
    userRepo,
  };
}

const transfer = {
  id: 't-1',
  assetId: 'a-1',
  requestedByUserId: 'requester',
  rejectionReason: 'Not this quarter',
};

describe('NotificationEventsListener', () => {
  describe('transfers', () => {
    it('notifies every approver except the requester when a transfer is requested', async () => {
      const { listener, notifications, userRepo } = build([
        { id: 'admin-1' },
        { id: 'requester' },
        { id: 'manager-1' },
      ]);
      await listener.onTransferRequested({ transfer });

      expect(notifications.create.mock.calls.map((c) => c[0].userId)).toEqual([
        'admin-1',
        'manager-1',
      ]);
      const where = userRepo.find.mock.calls[0][0].where;
      expect(where.isActive).toBe(true);
      expect(where.role.value).toEqual([UserRole.ADMIN, UserRole.MANAGER]);
    });

    it('notifies the requester when the transfer is approved', async () => {
      const { listener, notifications } = build();
      await listener.onTransferApproved({ transfer });
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'requester',
          title: 'Transfer approved',
          metadata: { transferId: 't-1', assetId: 'a-1' },
        }),
      );
    });

    it('notifies the requester with the reason when the transfer is rejected', async () => {
      const { listener, notifications } = build();
      await listener.onTransferRejected({ transfer });
      const dto = notifications.create.mock.calls[0][0];
      expect(dto.userId).toBe('requester');
      expect(dto.type).toBe(NotificationType.WARNING);
      expect(dto.message).toContain('Not this quarter');
    });
  });

  describe('reservations', () => {
    const reservation = { id: 'r-1', assetId: 'a-1', reservedByUserId: 'owner' };

    it('notifies the owner when a reservation is confirmed', async () => {
      const { listener, notifications } = build();
      await listener.onReservationConfirmed({ reservation });
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'owner', title: 'Reservation confirmed' }),
      );
    });

    it('notifies the owner when someone else cancels it', async () => {
      const { listener, notifications } = build();
      await listener.onReservationCancelled({
        reservation: { ...reservation, cancellationReason: 'Needed elsewhere' },
        actorId: 'manager-1',
      });
      const dto = notifications.create.mock.calls[0][0];
      expect(dto.userId).toBe('owner');
      expect(dto.message).toContain('Needed elsewhere');
    });

    it('stays quiet when the owner cancels their own reservation', async () => {
      const { listener, notifications } = build();
      await listener.onReservationCancelled({ reservation, actorId: 'owner' });
      expect(notifications.create).not.toHaveBeenCalled();
    });
  });

  describe('maintenance.due', () => {
    it('notifies the assignee and the department managers once each', async () => {
      const { listener, notifications } = build([{ id: 'mgr-1' }, { id: 'assignee' }]);
      await listener.onMaintenanceDue({
        maintenanceId: 'm-1',
        assetId: 'a-1',
        departmentId: 'd-1',
        assignedToUserId: 'assignee',
        title: 'Service printer',
        scheduledDate: '2026-02-01',
      });

      const recipients = notifications.create.mock.calls.map((c) => c[0].userId).sort();
      expect(recipients).toEqual(['assignee', 'mgr-1']);
      expect(notifications.create.mock.calls[0][0].type).toBe(NotificationType.ALERT);
    });

    it('notifies only the assignee when the asset has no department', async () => {
      const { listener, notifications, userRepo } = build();
      await listener.onMaintenanceDue({
        maintenanceId: 'm-1',
        assetId: 'a-1',
        assignedToUserId: 'assignee',
        title: 'Service',
      });
      expect(userRepo.find).not.toHaveBeenCalled();
      expect(notifications.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('license.seat_assigned', () => {
    it('notifies the user who got the seat', async () => {
      const { listener, notifications } = build();
      await listener.onLicenseSeatAssigned({
        licenseId: 'l-1',
        licenseName: 'Figma',
        userId: 'u-9',
      });
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u-9',
          message: 'You were assigned a seat for Figma.',
          metadata: { licenseId: 'l-1' },
        }),
      );
    });
  });

  it('swallows notification failures so the triggering action is not affected', async () => {
    const { listener, notifications } = build();
    notifications.create.mockRejectedValue(new Error('db down'));
    await expect(
      listener.onTransferApproved({ transfer }),
    ).resolves.toBeUndefined();
  });
});
