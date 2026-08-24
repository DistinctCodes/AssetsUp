# Notifications

In-app notifications for users — the delivery channel for expiry alerts,
transfer approvals and system messages. Consumed by the frontend
(`/notifications`) and the planned notifications center.

## Entity — `Notification`

`id`, `recipient` (ManyToOne User), `type`
(`ASSET_ASSIGNED | TRANSFER_REQUEST | TRANSFER_APPROVED | MAINTENANCE_DUE | WARRANTY_EXPIRING | SYSTEM`),
`title`, `body`, `resourceType`/`resourceId` (nullable link target), `readAt`
(nullable), `createdAt`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`   | `/api/notifications` | List the current user's notifications (newest first) |
| `PATCH` | `/api/notifications/:id/read` | Mark a notification as read |
| `PATCH` | `/api/notifications/read-all` | Mark all as read |

## Injectable `NotificationsService`

`notify(recipientId, { type, title, body, resource? })` creates a notification.
Other modules (transfers, maintenance, warranty alerts) call it so notifications
have a single creation path.
