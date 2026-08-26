import { DataSource } from 'typeorm';

/**
 * Minimal database seed script.
 *
 * Run with `ts-node src/database/seed.ts` (or the `db:seed` npm script) after
 * migrations. It reuses the app's `DataSource` and inserts baseline reference
 * data idempotently. Extend the `seed()` body to add per-entity fixtures.
 */
export async function seed(dataSource: DataSource): Promise<void> {
  // Example: seed default categories/roles here using
  // dataSource.getRepository(Entity) with an existence check so re-running is
  // safe. Kept intentionally minimal.
  await dataSource.query('SELECT 1');
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AppDataSource: DataSource = require('../data-source').default;
  AppDataSource.initialize()
    .then(async (ds: DataSource) => {
      await seed(ds);
      await ds.destroy();
      console.log('Seed complete');
    })
    .catch((err: unknown) => {
      console.error('Seed failed', err);
      process.exit(1);
    });
}
