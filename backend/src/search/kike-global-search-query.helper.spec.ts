import { buildSearchResults } from './kike-global-search-query.helper';

describe('kike-global-search-query.helper', () => {
  it('returns matching assets, users and documents for a known term', () => {
    const results = buildSearchResults(
      'AST-1',
      ['assets', 'users', 'documents'],
      {
        assets: [
          { id: 'a1', assetTag: 'AST-1', name: 'Laptop' },
          { id: 'a2', assetTag: 'AST-2', name: 'Phone' },
        ],
        users: [{ id: 'u1', email: 'ast-1@example.com', name: 'Alex' }],
        documents: [{ id: 'd1', name: 'AST-1 invoice' }],
      },
      10,
    );
    expect(results.results.assets.map((h) => h.id)).toEqual(['a1']);
    expect(results.results.users.map((h) => h.id)).toEqual(['u1']);
    expect(results.results.documents.map((h) => h.id)).toEqual(['d1']);
  });

  it('returns empty arrays for blank queries', () => {
    const results = buildSearchResults('  ', ['assets'], { assets: [{ id: 'a1', name: 'X' }], users: [], documents: [] });
    expect(results.results.assets).toEqual([]);
  });
});
