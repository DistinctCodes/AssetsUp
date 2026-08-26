import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';

/**
 * Global Redis-backed cache used to speed up reports and count-heavy endpoints.
 *
 * Endpoints cache their aggregates for a short TTL and invalidate on relevant
 * writes. Redis connection details come from env (`REDIS_HOST`, `REDIS_PORT`).
 */
@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: config.get<string>('REDIS_HOST') ?? 'localhost',
            port: Number(config.get<string>('REDIS_PORT') ?? 6379),
          },
          ttl: Number(config.get<string>('CACHE_TTL') ?? 30) * 1000,
        }),
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
