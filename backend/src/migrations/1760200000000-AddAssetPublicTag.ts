import { MigrationInterface, QueryRunner } from 'typeorm';

/** Optional public, checksummed asset tag (#1697). Existing identifiers are untouched. */
export class AddAssetPublicTag1760200000000 implements MigrationInterface {
  name = 'AddAssetPublicTag1760200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "publicTag" character varying',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_assets_publicTag" ON "assets" ("publicTag") WHERE "publicTag" IS NOT NULL AND "deletedAt" IS NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_assets_publicTag"');
    await queryRunner.query('ALTER TABLE "assets" DROP COLUMN IF EXISTS "publicTag"');
  }
}
