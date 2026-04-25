"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const dotenv = require("dotenv");
dotenv.config();
exports.AppDataSource = new typeorm_1.DataSource({
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
//# sourceMappingURL=data-source.js.map