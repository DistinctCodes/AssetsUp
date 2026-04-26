import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1745496000000 implements MigrationInterface {
  name = 'InitialMigration1745496000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."user_role_enum" AS ENUM ('ADMIN', 'MANAGER', 'STAFF')
    `);

    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "password" character varying NOT NULL,
        "role" "public"."user_role_enum" NOT NULL DEFAULT 'STAFF',
        "refreshToken" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_email" UNIQUE ("email"),
        CONSTRAINT "PK_user_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
  }
}
