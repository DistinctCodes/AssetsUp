'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assetApiClient } from '@/lib/api/assets';
import { queryKeys } from '@/lib/query/keys';
import type { Asset } from '@/lib/query/types/asset';

export function useUpdateAsset(assetId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      assetApiClient.updateAsset(assetId, data),

    onMutate: async (newData) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.assets.detail(assetId) });
      const previousAsset = queryClient.getQueryData<Asset>(queryKeys.assets.detail(assetId));
      if (previousAsset) {
        queryClient.setQueryData<Asset>(queryKeys.assets.detail(assetId), { ...previousAsset, ...newData });
      }
      return { previousAsset };
    },

    onError: (_err, _newData, context) => {
      // Rollback on error
      if (context?.previousAsset) {
        queryClient.setQueryData(queryKeys.assets.detail(assetId), context.previousAsset);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.detail(assetId) });
    },
  });
}