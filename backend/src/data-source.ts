import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { join } from 'path';
import { User } from './users/user.entity';
import { Department } from './departments/department.entity';
import { Category } from './categories/category.entity';
import { Location } from './locations/location.entity';
import { Asset } from './assets/asset.entity';
import { AssetHistory } from './assets/asset-history.entity';
import { AssetNote } from './assets/asset-note.entity';
import { Maintenance } from './assets/maintenance.entity';
import { AssetDocument } from './assets/asset-document.entity';
import { ApiKey } from './api-keys/api-key.entity';
import { Invitation } from './invitations/invitation.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'manage_assets',
  synchronize: false,
  entities: [
    User,
    Department,
    Category,
    Location,
    Asset,
    AssetHistory,
    AssetNote,
    Maintenance,
    AssetDocument,
    ApiKey,
    Invitation,
  ],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
});
