export const DEFAULT_REPORT_TTL_SECONDS = 300;

export interface CacheEntry<T> {
  value: T;
  storedAt: number;
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function buildReportCacheKey(
  report: string,
  params: Record<string, unknown> = {},
): string {
  return `${report}:${stableStringify(params)}`;
}

export class ReportCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlSeconds: number = DEFAULT_REPORT_TTL_SECONDS) {}

  private isFresh(entry: CacheEntry<T>, now: number): boolean {
    return (now - entry.storedAt) / 1000 < this.ttlSeconds;
  }

  get(key: string, now: number = Date.now()): T | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) return undefined;
    if (!this.isFresh(entry, now)) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  has(key: string, now: number = Date.now()): boolean {
    return this.get(key, now) !== undefined;
  }

  set(key: string, value: T, now: number = Date.now()): void {
    this.entries.set(key, { value, storedAt: now });
  }

  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  prune(now: number = Date.now()): number {
    let removed = 0;
    for (const [key, entry] of [...this.entries.entries()]) {
      if (!this.isFresh(entry, now)) {
        this.entries.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  get size(): number {
    return this.entries.size;
  }
}

export interface CacheOutcome<T> {
  value: T;
  hit: boolean;
}

export async function withReportCache<T>(
  cache: ReportCache<T>,
  key: string,
  loader: () => Promise<T>,
  now: number = Date.now(),
): Promise<CacheOutcome<T>> {
  const cached = cache.get(key, now);
  if (cached !== undefined) return { value: cached, hit: true };
  const value = await loader();
  cache.set(key, value, now);
  return { value, hit: false };
}
