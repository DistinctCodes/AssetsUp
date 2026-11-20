import { useQuery } from '@tanstack/react-query';
import { assetApiClient } from '@/lib/api/assets';
import { myRequestsApiClient } from '@/lib/api/my-requests';
import type { Asset } from '../types/asset';

const PAGE_SIZE = 100;
/** Safety stop so a runaway response cannot loop forever (10 000 assets assigned to one person). */
const MAX_PAGES = 100;

/**
 * Every asset assigned to the signed-in user. The filter runs on the server
 * (`assignedToId=me`), and further pages are fetched until the reported total
 * is reached, so the result is complete however large the organisation is.
 */
export async function fetchAllMyAssets(): Promise<Asset[]> {
  const assets: Asset[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await assetApiClient.getAssets({ assignedToId: 'me', page, limit: PAGE_SIZE });
    assets.push(...result.data);
    if (assets.length >= result.total || result.data.length === 0) break;
  }
  return assets;
}

export function useMyAssets(userId?: string) {
  return useQuery<Asset[]>({
    queryKey: ['assets', 'mine', userId ?? ''],
    queryFn: fetchAllMyAssets,
    enabled: !!userId,
  });
}

export function useMyRequests(userId?: string) {
  return useQuery({
    queryKey: ['my-requests', userId ?? ''],
    queryFn: () => myRequestsApiClient.list(userId as string),
    enabled: !!userId,
  });
}
