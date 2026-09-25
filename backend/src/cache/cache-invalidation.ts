export type CacheStore = {
  del(keys: string | string[]): Promise<unknown>;
};

export const ENTITY_CACHE_KEYS = {
  asset: 'asset',
  vendor: 'vendor',
  department: 'department',
  branch: 'branch',
  location: 'location',
  purchaseOrder: 'purchase-order',
  maintenance: 'maintenance',
  license: 'license',
} as const;

export type CacheableEntity = keyof typeof ENTITY_CACHE_KEYS;

export function buildEntityCacheKey(entity: string, id: string): string {
  return `${entity}:${id}`;
}

export function buildEntityCacheKeys(entity: string, ids: ReadonlyArray<string>): string[] {
  return ids
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
    .map((id) => buildEntityCacheKey(entity, id));
}

export function buildInvalidationPattern(entity: string): string {
  return `${entity}:*`;
}

export async function invalidateEntities(
  store: CacheStore,
  entity: string,
  ids?: ReadonlyArray<string>,
): Promise<string[]> {
  const keys = ids === undefined
    ? buildInvalidationPattern(entity)
    : buildEntityCacheKeys(entity, ids);
  if (Array.isArray(keys) && keys.length === 0) return [];
  await store.del(keys as string | string[]);
  return Array.isArray(keys) ? keys : [keys];
}

export function attachInvalidationHook<T extends { cache?: CacheStore }>(
  service: T,
  entity: string,
  onWrite: (result: unknown) => Promise<void>,
): (result: unknown) => Promise<void> {
  return async (result: unknown): Promise<void> => {
    await onWrite(result);
    if (service.cache) await invalidateEntities(service.cache, entity);
  };
}
