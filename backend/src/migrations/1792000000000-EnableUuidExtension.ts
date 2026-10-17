import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * First migration. Creates the migrations directory that data-source.ts and
 * the migration:* scripts point at, and enables the extension the uuid primary
 * keys rely on.
 *
 * The table baseline still has to be generated against a database with
 * `npm run migration:generate`, and committed next to this file.
 */
export class EnableUuidExtension1792000000000 implements MigrationInterface {
  name = 'EnableUuidExtension1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  }

  public async down(): Promise<void> {
    // Intentionally empty: other schemas may depend on the extension.
  }
}
