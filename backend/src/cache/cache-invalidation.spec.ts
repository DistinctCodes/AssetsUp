import {
  ENTITY_CACHE_KEYS,
  attachInvalidationHook,
  buildEntityCacheKey,
  buildEntityCacheKeys,
  buildInvalidationPattern,
  invalidateEntities,
} from './cache-invalidation';

function fakeStore() {
  const deleted: Array<string | string[]> = [];
  return {
    deleted,
    del: jest.fn(async (keys: string | string[]) => {
      deleted.push(keys);
      return 1;
    }),
  };
}

describe('entity cache keys', () => {
  it('knows the cacheable entities', () => {
    expect(Object.keys(ENTITY_CACHE_KEYS)).toContain('asset');
    expect(Object.keys(ENTITY_CACHE_KEYS)).toContain('vendor');
  });

  it('builds a namespaced key', () => {
    expect(buildEntityCacheKey('asset', 'abc-123')).toBe('asset:abc-123');
  });

  it('builds keys for many ids and drops empty ones', () => {
    expect(buildEntityCacheKeys('vendor', ['v1', 'v2'])).toEqual(['vendor:v1', 'vendor:v2']);
    expect(buildEntityCacheKeys('vendor', ['v1', '', null as unknown as string])).toEqual([
      'vendor:v1',
    ]);
  });

  it('builds a wildcard pattern for a whole entity', () => {
    expect(buildInvalidationPattern('vendor')).toBe('vendor:*');
  });
});

describe('invalidateEntities', () => {
  it('deletes the keys for the written records', async () => {
    const store = fakeStore();
    const keys = await invalidateEntities(store, 'asset', ['a1', 'a2']);
    expect(store.del).toHaveBeenCalledWith(['asset:a1', 'asset:a2']);
    expect(keys).toEqual(['asset:a1', 'asset:a2']);
  });

  it('deletes the whole entity when no ids are given', async () => {
    const store = fakeStore();
    await invalidateEntities(store, 'vendor');
    expect(store.del).toHaveBeenCalledWith('vendor:*');
  });

  it('does not call the cache when there is nothing to delete', async () => {
    const store = fakeStore();
    await expect(invalidateEntities(store, 'asset', [])).resolves.toEqual([]);
    expect(store.del).not.toHaveBeenCalled();
  });
});

describe('attachInvalidationHook', () => {
  it('writes first and then invalidates', async () => {
    const store = fakeStore();
    const service = { cache: store };
    const order: string[] = [];
    const hook = attachInvalidationHook(service, 'asset', async () => {
      order.push('write');
    });
    const original = store.del;
    store.del.mockImplementation(async (keys: string | string[]) => {
      order.push('invalidate');
      return original(keys);
    });

    await hook({ id: 'a1' });
    expect(order).toEqual(['write', 'invalidate']);
  });

  it('skips invalidation when no cache is configured', async () => {
    const service: { cache?: undefined } = {};
    const hook = attachInvalidationHook(service, 'asset', async () => undefined);
    await expect(hook({ id: 'a1' })).resolves.toBeUndefined();
  });
});
