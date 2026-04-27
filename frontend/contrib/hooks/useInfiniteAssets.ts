"use client";

import { useInfiniteQuery, UseInfiniteQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { assetApiClient, AssetListFilters, AssetListResponse } from "@/lib/api/assets";

interface UseInfiniteAssetsOptions {
  filters?: Omit<AssetListFilters, "page">;
  limit?: number;
}

export function useInfiniteAssets({ filters, limit = 20 }: UseInfiniteAssetsOptions = {}) {
  const queryKey = [...queryKeys.assets.list((filters as Record<string, unknown>) ?? {}), "infinite"] as const;

  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      assetApiClient.getAssets({ ...filters, page: pageParam, limit }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: AssetListResponse) => {
      const totalPages = Math.ceil(lastPage.total / limit);
      if (lastPage.page < totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
  } satisfies UseInfiniteQueryOptions<
    AssetListResponse,
    Error,
    AssetListResponse,
    typeof queryKey,
    number
  >);
}
