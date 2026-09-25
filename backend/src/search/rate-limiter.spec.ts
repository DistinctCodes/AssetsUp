import {
  DEFAULT_SEARCH_RATE_LIMIT,
  SlidingWindowRateLimiter,
} from './rate-limiter';

describe('SlidingWindowRateLimiter', () => {
  it('uses documented defaults', () => {
    expect(DEFAULT_SEARCH_RATE_LIMIT).toBe(30);
    const limiter = new SlidingWindowRateLimiter();
    const result = limiter.consume('user-1');
    expect(result.limit).toBe(30);
    expect(result.allowed).toBe(true);
  });

  it('allows requests up to the limit', () => {
    let now = 0;
    const limiter = new SlidingWindowRateLimiter({ limit: 3, windowMs: 1_000, now: () => now });
    expect(limiter.consume('a').allowed).toBe(true);
    expect(limiter.consume('a').allowed).toBe(true);
    const last = limiter.consume('a');
    expect(last.allowed).toBe(true);
    expect(last.remaining).toBe(0);
  });

  it('blocks once the limit is exceeded and reports when to retry', () => {
    let now = 0;
    const limiter = new SlidingWindowRateLimiter({ limit: 2, windowMs: 1_000, now: () => now });
    limiter.consume('a');
    now = 100;
    limiter.consume('a');
    now = 200;
    const blocked = limiter.consume('a');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBe(800);
  });

  it('lets requests through again once the window slides', () => {
    let now = 0;
    const limiter = new SlidingWindowRateLimiter({ limit: 1, windowMs: 1_000, now: () => now });
    expect(limiter.consume('a').allowed).toBe(true);
    expect(limiter.consume('a').allowed).toBe(false);
    now = 1_001;
    expect(limiter.consume('a').allowed).toBe(true);
  });

  it('tracks each caller separately', () => {
    let now = 0;
    const limiter = new SlidingWindowRateLimiter({ limit: 1, windowMs: 1_000, now: () => now });
    expect(limiter.consume('a').allowed).toBe(true);
    expect(limiter.consume('b').allowed).toBe(true);
    expect(limiter.consume('a').allowed).toBe(false);
    expect(limiter.trackedKeys).toBe(2);
  });

  it('shares one bucket when the caller is unknown', () => {
    let now = 0;
    const limiter = new SlidingWindowRateLimiter({ limit: 1, windowMs: 1_000, now: () => now });
    expect(limiter.consume().allowed).toBe(true);
    expect(limiter.consume(null).allowed).toBe(false);
    expect(limiter.consume('').allowed).toBe(false);
  });

  it('resets a single caller or all of them', () => {
    let now = 0;
    const limiter = new SlidingWindowRateLimiter({ limit: 1, windowMs: 1_000, now: () => now });
    limiter.consume('a');
    limiter.consume('b');
    limiter.reset('a');
    expect(limiter.consume('a').allowed).toBe(true);
    limiter.reset();
    expect(limiter.trackedKeys).toBe(0);
  });

  it('prunes buckets that have gone quiet', () => {
    let now = 0;
    const limiter = new SlidingWindowRateLimiter({ limit: 5, windowMs: 1_000, now: () => now });
    limiter.consume('a');
    now = 5_000;
    expect(limiter.prune()).toBe(1);
    expect(limiter.trackedKeys).toBe(0);
  });

  it('always denies when the limit is zero', () => {
    const limiter = new SlidingWindowRateLimiter({ limit: 0, now: () => 0 });
    const result = limiter.consume('a');
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBe(60_000);
  });
});
