# Contributing

## Database Migrations

This project keeps `synchronize` off outside development, so schema changes should go through TypeORM migrations.

1. Copy `.env.example` to `.env` and point it at a local Postgres database.
2. Generate a migration after changing entities with `npm run migration:generate`.
3. Review the generated file under `src/migrations/`.
4. Apply migrations locally with `npm run migration:run`.
5. If you need to undo the latest one, use `npm run migration:revert`.
6. Check pending/applied migrations with `npm run migration:show`.

Keep entity changes and their matching migration in the same commit so local and deployed environments stay in sync.
