import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AssetsModule } from './assets/assets.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuditLogInterceptor } from './audit-log/audit-log.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'postgres'),
        password: config.get('DB_PASSWORD', 'password'),
        database: config.get('DB_DATABASE', 'assetsup'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
      }),
    }),
    UsersModule,
    AuthModule,
    AssetsModule,
    AuditLogModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
