# Maintenance Records

Logs and tracks service work (preventive servicing, repairs) per asset, powering
the asset detail page's Maintenance tab.

## Entity — `MaintenanceRecord`

`id`, `asset` (ManyToOne), `type` (`PREVENTIVE | CORRECTIVE | SCHEDULED`),
`status` (`SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED`), `title`,
`description`, `scheduledDate`, `completedDate` (nullable), `cost` (nullable),
`performedBy`, `createdBy`, `createdAt`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/assets/:id/maintenance` | Create a maintenance record |
| `GET`  | `/api/assets/:id/maintenance` | List records for an asset (newest first) |
| `PATCH`| `/api/maintenance/:recordId`  | Update fields / status |

Status transitions are validated, and completing a record sets `completedDate`.
