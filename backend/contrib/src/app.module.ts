import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsModule } from './assets/assets.module';
import { UploadModule } from './upload/upload.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get('DB_HOST', 'localhost'),
        port: Number(configService.get('DB_PORT', 5432)),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'password'),
        database: configService.get('DB_DATABASE', 'manage_assets'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    AssetsModule,
    UploadModule,
    NotificationsModule,
  ],
})
export class AppModule {}
