import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface ApiKey {
  id: string;
  name: string;
  /** SHA-256 hash of the raw key — the raw key is shown only once at creation. */
  keyHash: string;
  revokedAt: Date | null;
  createdAt: Date;
}

/**
 * API keys for programmatic access: create, list and revoke. Only the hash of a
 * key is stored; the raw key is returned once at creation and never again.
 */
@Injectable()
export class ApiKeysService {
  hash(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  /** Generate a new raw key (caller stores the returned `ApiKey` with its hash). */
  generate(name: string): { rawKey: string; record: Omit<ApiKey, 'id'> } {
    const rawKey = `ak_${crypto.randomBytes(24).toString('hex')}`;
    return {
      rawKey,
      record: {
        name,
        keyHash: this.hash(rawKey),
        revokedAt: null,
        createdAt: new Date(),
      },
    };
  }

  /** Whether a presented raw key matches a stored, non-revoked key. */
  isValid(rawKey: string, keys: ApiKey[]): boolean {
    const hash = this.hash(rawKey);
    return keys.some((k) => k.keyHash === hash && k.revokedAt === null);
  }
}
