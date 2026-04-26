import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'assetsup',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: process.env.NODE_ENV !== 'production',
});
