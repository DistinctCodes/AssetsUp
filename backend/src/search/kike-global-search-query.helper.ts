import { SearchHit, SearchResults, SearchType } from './search.service';

export interface SearchableRecord {
  id: string;
  [key: string]: unknown;
}

export function normalizeSearchQuery(query: string | null | undefined): string {
  return typeof query === 'string' ? query.trim() : '';
}

export function containsSearchTerm(value: unknown, query: string): boolean {
  if (typeof value !== 'string') return false;
  return value.toLowerCase().includes(query.toLowerCase());
}

export function findAssetHits(records: SearchableRecord[], query: string, limit: number): SearchHit[] {
  const q = normalizeSearchQuery(query);
  if (!q) return [];
  const fields = ['name', 'assetTag', 'serialNumber', 'manufacturer', 'model'];
  return records
    .filter((r) => fields.some((f) => containsSearchTerm(r[f], q)))
    .slice(0, limit)
    .map((r) => ({ type: 'assets' as const, id: String(r.id), label: String(r.name ?? r.assetTag ?? r.id) }));
}

export function findUserHits(records: SearchableRecord[], query: string, limit: number): SearchHit[] {
  const q = normalizeSearchQuery(query);
  if (!q) return [];
  const fields = ['name', 'email'];
  return records
    .filter((r) => fields.some((f) => containsSearchTerm(r[f], q)))
    .slice(0, limit)
    .map((r) => ({ type: 'users' as const, id: String(r.id), label: String(r.name ?? r.email ?? r.id) }));
}

export function findDocumentHits(records: SearchableRecord[], query: string, limit: number): SearchHit[] {
  const q = normalizeSearchQuery(query);
  if (!q) return [];
  return records
    .filter((r) => containsSearchTerm(r.name, q))
    .slice(0, limit)
    .map((r) => ({ type: 'documents' as const, id: String(r.id), label: String(r.name ?? r.id) }));
}

export function buildSearchResults(
  query: string,
  types: SearchType[],
  datasets: { assets: SearchableRecord[]; users: SearchableRecord[]; documents: SearchableRecord[] },
  limit = 10,
): SearchResults {
  const wanted = new Set(types);
  return {
    query,
    results: {
      assets: wanted.has('assets') ? findAssetHits(datasets.assets, query, limit) : [],
      users: wanted.has('users') ? findUserHits(datasets.users, query, limit) : [],
      documents: wanted.has('documents') ? findDocumentHits(datasets.documents, query, limit) : [],
    },
  };
}
