import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface ApiKey {
  id: string;
  name: string;
  /** SHA-256 hash of the raw key — the raw key is shown only once at creation. */
  keyHash: string;
  revokedAt: Date | null;
  createdAt: Date;
  /**
   * When this key stops being valid. `null` means it never expires — a
   * leaked key with no expiry stays usable until someone notices and
   * revokes it by hand, so callers of `generate` should pass an explicit
   * expiry unless a non-expiring key is genuinely intended.
   */
  expiresAt: Date | null;
}

/** Default lifetime applied when `generate` isn't given an explicit expiry. */
const DEFAULT_API_KEY_TTL_DAYS = 90;

/**
 * API keys for programmatic access: create, list and revoke. Only the hash of a
 * key is stored; the raw key is returned once at creation and never again.
 */
@Injectable()
export class ApiKeysService {
  hash(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  /**
   * Generate a new raw key (caller stores the returned `ApiKey` with its
   * hash).
   *
   * @param expiresAt - When the key should stop being valid. Defaults to
   *   `DEFAULT_API_KEY_TTL_DAYS` from now; pass `null` explicitly for a
   *   key that never expires.
   */
  generate(
    name: string,
    expiresAt: Date | null | undefined = new Date(
      Date.now() + DEFAULT_API_KEY_TTL_DAYS * 24 * 60 * 60 * 1000,
    ),
  ): { rawKey: string; record: Omit<ApiKey, 'id'> } {
    const rawKey = `ak_${crypto.randomBytes(24).toString('hex')}`;
    return {
      rawKey,
      record: {
        name,
        keyHash: this.hash(rawKey),
        revokedAt: null,
        createdAt: new Date(),
        expiresAt: expiresAt ?? null,
      },
    };
  }

  /** Whether a presented raw key matches a stored, non-revoked, non-expired key. */
  isValid(rawKey: string, keys: ApiKey[]): boolean {
    const hash = this.hash(rawKey);
    const now = new Date();
    return keys.some(
      (k) =>
        k.keyHash === hash &&
        k.revokedAt === null &&
        (k.expiresAt === null || k.expiresAt > now),
    );
  }

  /** Whether a specific key record is currently expired (and not revoked already). */
  isExpired(key: ApiKey): boolean {
    return key.expiresAt !== null && key.expiresAt <= new Date();
  }
}
