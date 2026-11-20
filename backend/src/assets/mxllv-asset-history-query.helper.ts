export interface AssetHistoryEvent {
  id: string;
  assetId: string;
  type: string;
  description?: string | null;
  createdAt: string | Date;
  actor?: { id: string; email?: string } | null;
}

export interface HistoryQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface SqlHistoryQuery {
  whereSql: string;
  params: Record<string, unknown>;
  limit: number;
  offset: number;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export function buildAssetHistorySqlQuery(assetId: string, query: HistoryQuery = {}): SqlHistoryQuery {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const offset = (page - 1) * limit;
  const params: Record<string, unknown> = { assetId, limit, offset };
  let whereSql = '"assetId" = :assetId';
  if (query.search && query.search.trim()) {
    params.search = `%${escapeLike(query.search.trim())}%`;
    whereSql += ' AND ("type" ILIKE :search ESCAPE \'\\\' OR "description" ILIKE :search ESCAPE \'\\\')';
  }
  return { whereSql, params, limit, offset };
}

export function pageAssetHistory(
  events: ReadonlyArray<AssetHistoryEvent>,
  query: HistoryQuery = {},
): { items: AssetHistoryEvent[]; total: number; page: number; limit: number } {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const search = query.search?.trim().toLowerCase();
  const filtered = search
    ? events.filter((e) => (e.type ?? '').toLowerCase().includes(search) || (e.description ?? '').toLowerCase().includes(search))
    : [...events];
  const sorted = filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const start = (page - 1) * limit;
  return { items: sorted.slice(start, start + limit), total: sorted.length, page, limit };
}
