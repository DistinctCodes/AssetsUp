// src/transfers/services/transfer-lock.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class TransferLockService {
  private readonly LOCK_PREFIX = 'transfer:lock:asset:';
  private readonly LOCK_TTL = 3600000; // 1 hour in milliseconds

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async lockAssets(assetIds: string[], transferId: string): Promise<void> {
    for (const assetId of assetIds) {
      const key = `${this.LOCK_PREFIX}${assetId}`;
      await this.cacheManager.set(key, transferId, this.LOCK_TTL);
    }
  }

  async unlockAssets(assetIds: string[]): Promise<void> {
    for (const assetId of assetIds) {
      const key = `${this.LOCK_PREFIX}${assetId}`;
      await this.cacheManager.del(key);
    }
  }

  async checkAssetsLocked(assetIds: string[]): Promise<string[]> {
    const lockedAssets: string[] = [];

    for (const assetId of assetIds) {
      const key = `${this.LOCK_PREFIX}${assetId}`;
      const transferId = await this.cacheManager.get<string>(key);
      if (transferId) {
        lockedAssets.push(assetId);
      }
    }

    return lockedAssets;
  }

  async isAssetLocked(assetId: string): Promise<boolean> {
    const key = `${this.LOCK_PREFIX}${assetId}`;
    const transferId = await this.cacheManager.get<string>(key);
    return !!transferId;
  }

  async getAssetLock(assetId: string): Promise<string | null> {
    const key = `${this.LOCK_PREFIX}${assetId}`;
    return this.cacheManager.get<string>(key);
  }
}
