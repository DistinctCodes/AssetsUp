'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/query/keys';

export function useRealtimeUpdates() {
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  const handleEvent = useCallback(
    (eventType: string) => {
      switch (eventType) {
        case 'asset_created':
        case 'asset_updated':
        case 'asset_deleted':
          queryClient.invalidateQueries({ queryKey: queryKeys.assets.lists() });
          break;

        case 'asset_transferred':
          queryClient.invalidateQueries({ queryKey: queryKeys.assets.lists() });
          queryClient.invalidateQueries({ queryKey: queryKeys.assets.details() });
          break;

        case 'maintenance_scheduled':
        case 'maintenance_completed':
          queryClient.invalidateQueries({ queryKey: ['assets', 'detail'] });
          break;

        default:
          break;
      }
    },
    [queryClient],
  );

  const {
    isConnected,
    notifications,
    setNotifications,
  } = useWebSocket({
    userId,
    onNotification: () => {
      handleEvent('notification');
    },
    onTransferCreated: () => {
      handleEvent('asset_transferred');
    },
    onTransferApproved: () => {
      handleEvent('asset_updated');
    },
    onTransferRejected: () => {
      handleEvent('asset_updated');
    },
    onTransferExecuted: () => {
      handleEvent('asset_transferred');
    },
  });

  return {
    isConnected,
    notifications,
    setNotifications,
  };
}
