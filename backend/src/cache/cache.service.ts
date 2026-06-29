import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      this.logger.warn(
        `Failed to fetch key "${key}" from cache: ${error.message}`,
      );
      return null; // Graceful fallback
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      // Pass configurations safely matching your cache-manager library specification
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      this.logger.warn(
        `Failed to set key "${key}" into cache: ${error.message}`,
      );
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.warn(
        `Failed to delete key "${key}" from cache: ${error.message}`,
      );
    }
  }
}
