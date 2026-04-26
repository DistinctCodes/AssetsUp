'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import { queryKeys } from '@/lib/query/keys';

interface AssetEventData {
  id: string;
  name: string;
  assetId: string;
  status?: string;
  [key: string]: any;
}

interface UseAssetWebSocketOptions {
  enabled?: boolean;
}

const EVENT_MAP = [
  { event: 'asset-created', message: (data: AssetEventData) => `Asset "${data.name}" created`, invalidate: ['assets'] },
  { event: 'asset-updated', message: (data: AssetEventData) => `Asset "${data.name}" updated`, invalidate: ['assets', 'detail'] },
  { event: 'asset-transferred', message: (data: AssetEventData) => `Asset "${data.name}" transferred`, invalidate: ['assets', 'detail'] },
  { event: 'asset-status-changed', message: (data: AssetEventData) => `Asset "${data.name}" status changed to ${data.status}`, invalidate: ['assets', 'detail'] },
];

export function useAssetWebSocket(options: UseAssetWebSocketOptions = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:6003';
    const socket = io(socketUrl, {
      transports: ['websocket'],
      auth: { token },
    });

    socket.on('connect', () => {
      console.log('Connected to asset WebSocket server');
    });

    socket.on('connect_error', (error) => {
      console.error('Asset WebSocket connection error:', error);
    });

    EVENT_MAP.forEach(({ event, message, invalidate }) => {
      socket.on(event, (data: AssetEventData) => {
        // Show toast notification
        toast.info(message(data), {
          position: 'top-right',
          autoClose: 3000,
        });

        // Invalidate relevant query caches
        if (invalidate.includes('assets')) {
          queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
        }
        if (invalidate.includes('detail') && data.id) {
          queryClient.invalidateQueries({ queryKey: queryKeys.assets.detail(data.id) });
        }
        if (invalidate.includes('reports')) {
          queryClient.invalidateQueries({ queryKey: queryKeys.reports.summary() });
        }
      });
    });

    socketRef.current = socket;

    return () => {
      disconnect();
    };
  }, [enabled, queryClient, disconnect]);

  return {
    isConnected: socketRef.current?.connected ?? false,
    disconnect,
  };
}
