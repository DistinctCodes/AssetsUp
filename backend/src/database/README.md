# Database Migrations & Seeding

The schema is managed with **TypeORM migrations** rather than `synchronize`, so
schema changes are explicit, reviewable and safe for production.

## Disable synchronize

Ensure the `DataSource` (`src/data-source.ts`) and the `TypeOrmModule` config use
`synchronize: false` and point `migrations` at `src/migrations/*.ts`.

## Commands

```bash
# generate a migration from entity changes
npm run migration:generate --name=<Name>

# apply pending migrations
npm run migration:run

# revert the last migration
npm run migration:revert

# seed baseline data (after migrations)
npm run db:seed
```

## Seeding

`src/database/seed.ts` reuses the app `DataSource` and inserts baseline reference
data idempotently, so it is safe to re-run.
