import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1711641600000 implements MigrationInterface {
  name = 'InitialSchema1711641600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await queryRunner.query(
      `CREATE TYPE "users_role_enum" AS ENUM ('admin', 'manager', 'staff')`,
    );
    await queryRunner.query(
      `CREATE TYPE "locations_type_enum" AS ENUM ('office', 'warehouse', 'branch', 'remote')`,
    );
    await queryRunner.query(
      `CREATE TYPE "assets_status_enum" AS ENUM ('ACTIVE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "assets_condition_enum" AS ENUM ('NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "assets_stellarstatus_enum" AS ENUM ('NOT_REGISTERED', 'PENDING', 'CONFIRMED', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "asset_history_action_enum" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'TRANSFERRED', 'MAINTENANCE', 'NOTE_ADDED', 'DOCUMENT_UPLOADED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "asset_maintenance_type_enum" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'SCHEDULED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "asset_maintenance_status_enum" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "invitations_role_enum" AS ENUM ('admin', 'manager', 'staff')`,
    );

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "password" character varying NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'staff',
        "refreshToken" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "departments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_departments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_departments_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "asset_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_asset_categories_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_asset_categories_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "locations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "type" "locations_type_enum" NOT NULL,
        "address" character varying,
        "description" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_locations_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_locations_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "assets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "assetId" character varying NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "serialNumber" character varying,
        "purchaseDate" date,
        "purchasePrice" numeric(15,2),
        "currentValue" numeric(15,2),
        "warrantyExpiration" date,
        "status" "assets_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "condition" "assets_condition_enum" NOT NULL DEFAULT 'NEW',
        "location" character varying,
        "imageUrls" text,
        "customFields" jsonb,
        "tags" text,
        "manufacturer" character varying,
        "model" character varying,
        "barcode" character varying,
        "qrCode" character varying,
        "notes" text,
        "stellarAssetId" character varying,
        "stellarTxHash" character varying,
        "stellarStatus" "assets_stellarstatus_enum" NOT NULL DEFAULT 'NOT_REGISTERED',
        "categoryId" uuid NOT NULL,
        "departmentId" uuid NOT NULL,
        "assignedToId" uuid,
        "createdById" uuid,
        "updatedById" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assets_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_assets_assetId" UNIQUE ("assetId"),
        CONSTRAINT "FK_assets_category" FOREIGN KEY ("categoryId") REFERENCES "asset_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_assets_department" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_assets_assignedTo" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_assets_createdBy" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_assets_updatedBy" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "asset_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "assetId" uuid NOT NULL,
        "action" "asset_history_action_enum" NOT NULL,
        "description" character varying NOT NULL,
        "previousValue" jsonb,
        "newValue" jsonb,
        "performedById" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_asset_history_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_asset_history_asset" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_asset_history_performedBy" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "asset_notes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "assetId" character varying NOT NULL,
        "content" text NOT NULL,
        "createdById" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_asset_notes_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_asset_notes_createdBy" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "asset_maintenance" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "assetId" character varying NOT NULL,
        "type" "asset_maintenance_type_enum" NOT NULL,
        "description" text NOT NULL,
        "scheduledDate" date NOT NULL,
        "completedDate" date,
        "cost" numeric(10,2),
        "performedById" uuid,
        "notes" text,
        "status" "asset_maintenance_status_enum" NOT NULL DEFAULT 'SCHEDULED',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_asset_maintenance_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_asset_maintenance_performedBy" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "asset_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "assetId" character varying NOT NULL,
        "name" character varying NOT NULL,
        "url" character varying NOT NULL,
        "type" character varying NOT NULL DEFAULT 'application/octet-stream',
        "size" integer,
        "uploadedById" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_asset_documents_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_asset_documents_uploadedBy" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "api_keys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "keyHash" character varying NOT NULL,
        "prefix" character varying(8) NOT NULL,
        "ownerId" uuid NOT NULL,
        "lastUsedAt" TIMESTAMP,
        "expiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "revokedAt" TIMESTAMP,
        CONSTRAINT "PK_api_keys_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_api_keys_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "invitations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "role" "invitations_role_enum" NOT NULL,
        "token" character varying NOT NULL,
        "invitedById" uuid NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "acceptedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invitations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_invitations_invitedBy" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "invitations"');
    await queryRunner.query('DROP TABLE IF EXISTS "api_keys"');
    await queryRunner.query('DROP TABLE IF EXISTS "asset_documents"');
    await queryRunner.query('DROP TABLE IF EXISTS "asset_maintenance"');
    await queryRunner.query('DROP TABLE IF EXISTS "asset_notes"');
    await queryRunner.query('DROP TABLE IF EXISTS "asset_history"');
    await queryRunner.query('DROP TABLE IF EXISTS "assets"');
    await queryRunner.query('DROP TABLE IF EXISTS "locations"');
    await queryRunner.query('DROP TABLE IF EXISTS "asset_categories"');
    await queryRunner.query('DROP TABLE IF EXISTS "departments"');
    await queryRunner.query('DROP TABLE IF EXISTS "users"');

    await queryRunner.query('DROP TYPE IF EXISTS "invitations_role_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "asset_maintenance_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "asset_maintenance_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "asset_history_action_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "assets_stellarstatus_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "assets_condition_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "assets_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "locations_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "users_role_enum"');
  }
}
