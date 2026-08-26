# Activity Logging

Captures a record of sensitive operations for accountability and debugging —
who did what, when, and to which resource.

## Entity — `ActivityLog`

`id`, `actor` (ManyToOne User, nullable for system actions), `action` (string,
e.g. `asset.deleted`, `transfer.approved`), `resourceType`/`resourceId`
(nullable), `metadata` (jsonb), `ip` (nullable), `createdAt`.

## Injectable `ActivityLogService`

```ts
log({ actor, action, resourceType?, resourceId?, metadata?, ip? }): Promise<void>
```

Call it from services when a sensitive operation succeeds (deletes, transfers,
role/permission changes, payment/wallet actions). Keeping one entry point means
every audited action is recorded the same way.

## Notes

- Records are **append-only** (create/read only) so the trail is tamper-evident.
- Do not log secrets or full credentials in `metadata`.
- Admin endpoints expose read/filter access over the log.
