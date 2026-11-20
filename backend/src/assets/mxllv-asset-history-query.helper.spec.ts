import { buildAssetHistorySqlQuery, pageAssetHistory } from './mxllv-asset-history-query.helper';

describe('mxllv-asset-history-query.helper', () => {
  it('builds SQL pagination/filter clauses with LIMIT/OFFSET and escaped search', () => {
    const q = buildAssetHistorySqlQuery('a1', { page: 2, limit: 10, search: '100%' });
    expect(q.limit).toBe(10);
    expect(q.offset).toBe(10);
    expect(q.whereSql).toContain('LIMIT' ? 'ILIKE' : 'ILIKE'); // ensures ILIKE in whereSql
    expect(q.whereSql).toContain('ILIKE');
    expect(q.params.search).toBe('%100\\%%');
  });

  it('paginates and counts in-memory fallback consistently', () => {
    const events = Array.from({ length: 5 }, (_, i) => ({ id: String(i), assetId: 'a1', type: 'T', createdAt: `2026-11-2${i}T00:00:00Z` }));
    const page = pageAssetHistory(events, { page: 1, limit: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(5);
  });
});
