import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AssetsModule } from './assets/assets.module';
import { CacheService } from './cache/cache.service';

@Module({
  imports: [
    // Global environment configuration provider
    ConfigModule.forRoot({ isGlobal: true }),

    // Asynchronous Database Configuration Management
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: parseInt(configService.get<string>('DB_PORT', '5432'), 10),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'password'),
        database: configService.get<string>('DB_DATABASE', 'manage_assets'),
        autoLoadEntities: true,
        synchronize: configService.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // #878 [BE-05] Asynchronous Redis Cache Layer Registration
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST', 'localhost');
        const port = parseInt(configService.get<string>('REDIS_PORT', '6379'), 10);
        const ttl = parseInt(configService.get<string>('CACHE_TTL', '300'), 10);

        return {
          store: redisStore as any,
          host,
          port,
          ttl,
          // Guard/Fallback: Non-crashing error mitigation loop for missing/offline redis engines
          retry_strategy: (options: any) => {
            if (options.error && options.error.code === 'ECONNREFUSED') {
              return new Error('Redis connection refused. Operating with inline graceful fallback.');
            }
            return Math.min(options.attempt * 100, 3000); // Backoff connection retry
          },
        };
      },
    }),

    AssetsModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    CacheService, // Registering the shared custom cache service utility directly within global context
  ],
  exports: [
    CacheService, // Exporting CacheService so modules implementing custom invalidation can resolve it cleanly
  ],
})
export class AppModule {}