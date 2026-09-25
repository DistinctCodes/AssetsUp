export const DEFAULT_SEARCH_RATE_LIMIT = 30;
export const DEFAULT_SEARCH_RATE_WINDOW_MS = 60_000;

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
  now?: () => number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterMs: number;
}

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(options: RateLimitOptions = {}) {
    this.limit = options.limit ?? DEFAULT_SEARCH_RATE_LIMIT;
    this.windowMs = options.windowMs ?? DEFAULT_SEARCH_RATE_WINDOW_MS;
    this.now = options.now ?? ((): number => Date.now());
  }

  private keyFor(key: string | null | undefined): string {
    return typeof key === 'string' && key.length > 0 ? key : 'global';
  }

  private windowStart(now: number): number {
    return now - this.windowMs;
  }

  consume(key?: string | null): RateLimitResult {
    const bucketKey = this.keyFor(key);
    const now = this.now();
    if (this.limit <= 0) {
      return { allowed: false, limit: this.limit, remaining: 0, retryAfterMs: this.windowMs };
    }
    const start = this.windowStart(now);
    const recent = (this.hits.get(bucketKey) ?? []).filter((at) => at > start);

    if (recent.length >= this.limit) {
      this.hits.set(bucketKey, recent);
      return {
        allowed: false,
        limit: this.limit,
        remaining: 0,
        retryAfterMs: Math.max(0, recent[0] + this.windowMs - now),
      };
    }

    recent.push(now);
    this.hits.set(bucketKey, recent);
    return {
      allowed: true,
      limit: this.limit,
      remaining: Math.max(0, this.limit - recent.length),
      retryAfterMs: 0,
    };
  }

  reset(key?: string | null): void {
    if (key === undefined || key === null) this.hits.clear();
    else this.hits.delete(this.keyFor(key));
  }

  prune(): number {
    const start = this.windowStart(this.now());
    let removed = 0;
    for (const [key, timestamps] of [...this.hits.entries()]) {
      const recent = timestamps.filter((at) => at > start);
      if (recent.length === 0) {
        this.hits.delete(key);
        removed += 1;
      } else {
        this.hits.set(key, recent);
      }
    }
    return removed;
  }

  get trackedKeys(): number {
    return this.hits.size;
  }
}
