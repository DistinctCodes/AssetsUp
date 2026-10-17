import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Makes user emails case-insensitively unique (#1572).
 *
 * Existing rows are trimmed and lower-cased. If two accounts differ only by
 * case the migration stops and lists them: merging accounts is a data decision
 * that must not be made silently.
 */
export class NormaliseUserEmails1760000000000 implements MigrationInterface {
  name = 'NormaliseUserEmails1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('users'))) return;

    const clashes: { email: string; count: string }[] = await queryRunner.query(
      `SELECT lower(btrim(email)) AS email, count(*) AS count
         FROM users GROUP BY lower(btrim(email)) HAVING count(*) > 1`,
    );
    if (clashes.length) {
      throw new Error(
        `Cannot normalise user emails; resolve these duplicates first: ${clashes
          .map((c) => `${c.email} (x${c.count})`)
          .join(', ')}`,
      );
    }

    await queryRunner.query(
      `UPDATE users SET email = lower(btrim(email)) WHERE email <> lower(btrim(email))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_email_lower" ON users (lower(email))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Lower-casing is not reversible; only the new index is dropped.
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email_lower"`);
  }
}
