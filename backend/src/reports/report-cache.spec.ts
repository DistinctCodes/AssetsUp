import {
  DEFAULT_REPORT_TTL_SECONDS,
  ReportCache,
  buildReportCacheKey,
  withReportCache,
} from './report-cache';

describe('buildReportCacheKey', () => {
  it('is stable regardless of parameter order', () => {
    const a = buildReportCacheKey('depreciation', { from: '2026-01-01', to: '2026-12-31' });
    const b = buildReportCacheKey('depreciation', { to: '2026-12-31', from: '2026-01-01' });
    expect(a).toBe(b);
  });

  it('distinguishes different parameters', () => {
    expect(buildReportCacheKey('depreciation', { from: 'a' })).not.toBe(
      buildReportCacheKey('depreciation', { from: 'b' }),
    );
  });

  it('distinguishes different reports', () => {
    expect(buildReportCacheKey('depreciation')).not.toBe(buildReportCacheKey('inventory'));
  });

  it('includes the report name', () => {
    expect(buildReportCacheKey('depreciation', {})).toContain('depreciation:');
  });

  it('ignores undefined values but keeps null', () => {
    expect(buildReportCacheKey('r', { a: undefined })).toBe(buildReportCacheKey('r', {}));
    expect(buildReportCacheKey('r', { a: null })).not.toBe(buildReportCacheKey('r', {}));
  });

  it('serialises nested values deterministically', () => {
    expect(buildReportCacheKey('r', { nested: { b: 1, a: 2 } })).toBe(
      buildReportCacheKey('r', { nested: { a: 2, b: 1 } }),
    );
  });
});

describe('ReportCache', () => {
  it('stores and returns a value', () => {
    const cache = new ReportCache<string>();
    cache.set('k', 'v');
    expect(cache.get('k')).toBe('v');
    expect(cache.has('k')).toBe(true);
  });

  it('returns undefined for a miss', () => {
    expect(new ReportCache<string>().get('missing')).toBeUndefined();
  });

  it('expires entries once the TTL has passed', () => {
    const cache = new ReportCache<string>(60);
    cache.set('k', 'v', 0);
    expect(cache.get('k', 30_000)).toBe('v');
    expect(cache.get('k', 61_000)).toBeUndefined();
  });

  it('drops the entry when it is read after expiry', () => {
    const cache = new ReportCache<string>(1);
    cache.set('k', 'v', 0);
    cache.get('k', 2_000);
    expect(cache.size).toBe(0);
  });

  it('deletes and clears', () => {
    const cache = new ReportCache<string>();
    cache.set('a', '1');
    cache.set('b', '2');
    expect(cache.delete('a')).toBe(true);
    expect(cache.delete('a')).toBe(false);
    expect(cache.size).toBe(1);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('prunes stale entries and reports how many were removed', () => {
    const cache = new ReportCache<string>(10);
    cache.set('old', 'v', 0);
    cache.set('fresh', 'v', 15_000);
    expect(cache.prune(16_000)).toBe(1);
    expect(cache.size).toBe(1);
  });

  it('uses a five minute default TTL', () => {
    expect(DEFAULT_REPORT_TTL_SECONDS).toBe(300);
  });
});

describe('withReportCache', () => {
  it('loads once and then serves from cache', async () => {
    const cache = new ReportCache<number>();
    const loader = jest.fn(async () => 42);
    const first = await withReportCache(cache, 'k', loader, 0);
    const second = await withReportCache(cache, 'k', loader, 1_000);
    expect(first).toEqual({ value: 42, hit: false });
    expect(second).toEqual({ value: 42, hit: true });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('reloads after the entry expires', async () => {
    const cache = new ReportCache<number>(1);
    const loader = jest.fn(async () => 1);
    await withReportCache(cache, 'k', loader, 0);
    await withReportCache(cache, 'k', loader, 5_000);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('caches falsy values', async () => {
    const cache = new ReportCache<number>();
    const loader = jest.fn(async () => 0);
    const first = await withReportCache(cache, 'k', loader, 0);
    const second = await withReportCache(cache, 'k', loader, 0);
    expect(first.hit).toBe(false);
    expect(second.hit).toBe(true);
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
