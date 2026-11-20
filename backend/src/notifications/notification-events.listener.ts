import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './entities/notification.entity';
import { User, UserRole } from '../users/entities/user.entity';

type TransferPayload = {
  transfer: {
    id: string;
    assetId: string;
    requestedByUserId: string;
    toDepartmentId?: string;
    rejectionReason?: string;
  };
};
type ReservationPayload = {
  reservation: {
    id: string;
    assetId: string;
    reservedByUserId: string;
    startsAt?: Date;
    cancellationReason?: string;
  };
  actorId?: string;
};
type MaintenanceDuePayload = {
  maintenanceId: string;
  assetId: string;
  departmentId?: string;
  assignedToUserId?: string;
  title: string;
  scheduledDate?: string;
};
type LicenseSeatPayload = {
  licenseId: string;
  licenseName?: string;
  userId: string;
};

/**
 * Turns domain events into in-app notifications. A failure here is logged and
 * swallowed: a notification problem must never fail the action that caused it.
 */
@Injectable()
export class NotificationEventsListener {
  private readonly logger = new Logger(NotificationEventsListener.name);

  constructor(
    private readonly notifications: NotificationsService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  private async safely(label: string, work: () => Promise<unknown>) {
    try {
      await work();
    } catch (error) {
      this.logger.error(
        `Could not create notification for ${label}: ${(error as Error).message}`,
      );
    }
  }

  /** Active admins and managers, optionally excluding one user (the requester). */
  private async approvers(excludeUserId?: string): Promise<string[]> {
    const users = await this.userRepo.find({
      where: { role: In([UserRole.ADMIN, UserRole.MANAGER]), isActive: true },
      select: ['id'],
    });
    return users.map((u) => u.id).filter((id) => id !== excludeUserId);
  }

  @OnEvent('transfer.requested')
  async onTransferRequested({ transfer }: TransferPayload) {
    await this.safely('transfer.requested', async () => {
      for (const userId of await this.approvers(transfer.requestedByUserId)) {
        await this.notifications.create({
          userId,
          title: 'Transfer approval needed',
          message: 'An asset transfer is waiting for your approval.',
          type: NotificationType.INFO,
          metadata: { transferId: transfer.id, assetId: transfer.assetId },
        });
      }
    });
  }

  @OnEvent('transfer.approved')
  async onTransferApproved({ transfer }: TransferPayload) {
    await this.safely('transfer.approved', () =>
      this.notifications.create({
        userId: transfer.requestedByUserId,
        title: 'Transfer approved',
        message: 'Your asset transfer request was approved.',
        type: NotificationType.INFO,
        metadata: { transferId: transfer.id, assetId: transfer.assetId },
      }),
    );
  }

  @OnEvent('transfer.rejected')
  async onTransferRejected({ transfer }: TransferPayload) {
    await this.safely('transfer.rejected', () =>
      this.notifications.create({
        userId: transfer.requestedByUserId,
        title: 'Transfer rejected',
        message: transfer.rejectionReason
          ? `Your asset transfer request was rejected: ${transfer.rejectionReason}`
          : 'Your asset transfer request was rejected.',
        type: NotificationType.WARNING,
        metadata: { transferId: transfer.id, assetId: transfer.assetId },
      }),
    );
  }

  @OnEvent('reservation.confirmed')
  async onReservationConfirmed({ reservation }: ReservationPayload) {
    await this.safely('reservation.confirmed', () =>
      this.notifications.create({
        userId: reservation.reservedByUserId,
        title: 'Reservation confirmed',
        message: 'Your asset reservation was confirmed.',
        type: NotificationType.INFO,
        metadata: { reservationId: reservation.id, assetId: reservation.assetId },
      }),
    );
  }

  @OnEvent('reservation.cancelled')
  async onReservationCancelled({ reservation, actorId }: ReservationPayload) {
    // Cancelling your own reservation needs no notification.
    if (actorId && actorId === reservation.reservedByUserId) return;
    await this.safely('reservation.cancelled', () =>
      this.notifications.create({
        userId: reservation.reservedByUserId,
        title: 'Reservation cancelled',
        message: reservation.cancellationReason
          ? `Your asset reservation was cancelled: ${reservation.cancellationReason}`
          : 'Your asset reservation was cancelled.',
        type: NotificationType.WARNING,
        metadata: { reservationId: reservation.id, assetId: reservation.assetId },
      }),
    );
  }

  @OnEvent('maintenance.due')
  async onMaintenanceDue(payload: MaintenanceDuePayload) {
    await this.safely('maintenance.due', async () => {
      const recipients = new Set<string>();
      if (payload.assignedToUserId) recipients.add(payload.assignedToUserId);
      if (payload.departmentId) {
        const managers = await this.userRepo.find({
          where: {
            departmentId: payload.departmentId,
            role: In([UserRole.ADMIN, UserRole.MANAGER]),
            isActive: true,
          },
          select: ['id'],
        });
        managers.forEach((m) => recipients.add(m.id));
      }
      for (const userId of recipients) {
        await this.notifications.create({
          userId,
          title: 'Maintenance due soon',
          message: `${payload.title} is scheduled${payload.scheduledDate ? ` for ${payload.scheduledDate}` : ' soon'}.`,
          type: NotificationType.ALERT,
          metadata: {
            maintenanceId: payload.maintenanceId,
            assetId: payload.assetId,
          },
        });
      }
    });
  }

  @OnEvent('license.seat_assigned')
  async onLicenseSeatAssigned(payload: LicenseSeatPayload) {
    await this.safely('license.seat_assigned', () =>
      this.notifications.create({
        userId: payload.userId,
        title: 'License seat assigned',
        message: payload.licenseName
          ? `You were assigned a seat for ${payload.licenseName}.`
          : 'You were assigned a license seat.',
        type: NotificationType.INFO,
        metadata: { licenseId: payload.licenseId },
      }),
    );
  }
}
