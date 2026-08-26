# Asset History

Records every lifecycle event of an asset — the audit backbone behind the
history timeline tab on the asset detail page.

## Entity — `AssetHistoryEvent`

`id`, `asset` (ManyToOne), `action`
(`CREATED | UPDATED | STATUS_CHANGED | TRANSFERRED | MAINTENANCE | NOTE_ADDED | DOCUMENT_UPLOADED`),
`actor` (ManyToOne User), `details` (jsonb — old/new snapshot), `createdAt`.

## Recording

`AssetHistoryService.record({ asset, action, actor, details })` appends an event.
Other services (assets, maintenance, transfers, notes, documents) call it when a
relevant change occurs, so the timeline stays complete.

## Endpoint

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/assets/:id/history` | List history events for an asset (newest first) |

History events are append-only, keeping the lifecycle trail auditable.
