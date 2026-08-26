# Asset Transfers

Request/approval workflow for moving an asset between users, departments or
locations.

## Entity — `Transfer`

`id`, `asset` (ManyToOne), `fromUser`/`toUser` (or from/to department),
`requestedBy` (User), `status` (`PENDING | APPROVED | REJECTED | CANCELLED`),
`reason`, `decidedBy` (nullable User), `decidedAt` (nullable), `createdAt`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST`  | `/api/transfers` | Request a transfer `{ assetId, toUserId, reason }` |
| `GET`   | `/api/transfers` | List transfers (filter by status / asset / user) |
| `PATCH` | `/api/transfers/:id/approve` | Approve (admin/manager) |
| `PATCH` | `/api/transfers/:id/reject` | Reject with a reason |

## Behaviour

- On **approve**, the asset's owner is updated, a `TRANSFERRED` history event is
  recorded, and both parties are notified.
- Only the requester can cancel a `PENDING` transfer; only admins/managers can
  approve or reject.
