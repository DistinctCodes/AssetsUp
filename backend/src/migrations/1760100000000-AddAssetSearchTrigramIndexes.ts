import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Trigram GIN indexes so `ILIKE '%term%'` searches on assets (#1585) don't
 * scan the whole table. Requires the `pg_trgm` extension.
 */
export class AddAssetSearchTrigramIndexes1760100000000
  implements MigrationInterface
{
  name = 'AddAssetSearchTrigramIndexes1760100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('assets'))) return;
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    for (const [index, column] of [
      ['IDX_assets_name_trgm', 'name'],
      ['IDX_assets_asset_tag_trgm', '"assetTag"'],
      ['IDX_assets_serial_number_trgm', '"serialNumber"'],
    ]) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "${index}" ON assets USING gin (${column} gin_trgm_ops)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const index of [
      'IDX_assets_name_trgm',
      'IDX_assets_asset_tag_trgm',
      'IDX_assets_serial_number_trgm',
    ]) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${index}"`);
    }
  }
}
