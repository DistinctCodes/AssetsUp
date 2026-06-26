'use client';

import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
  relatedTransferId?: string;
}

interface UseWebSocketOptions {
  userId?: string;
  onNotification?: (notification: Notification) => void;
  onTransferCreated?: (data: any) => void;
  onTransferApproved?: (data: any) => void;
  onTransferRejected?: (data: any) => void;
  onTransferCancelled?: (data: any) => void;
  onTransferExecuted?: (data: any) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const connect = useCallback(() => {
    if (!options.userId) return;

    const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8000', {
      transports: ['websocket'],
      query: {
        userId: options.userId
      }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to WebSocket server');
      
      // Join user room
      newSocket.emit('join_room', { userId: options.userId });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from WebSocket server');
    });

    newSocket.on('notification', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      options.onNotification?.(notification);
    });

    newSocket.on('transfer_created', (data: any) => {
      options.onTransferCreated?.(data);
    });

    newSocket.on('transfer_approved', (data: any) => {
      options.onTransferApproved?.(data);
    });

    newSocket.on('transfer_rejected', (data: any) => {
      options.onTransferRejected?.(data);
    });

    newSocket.on('transfer_cancelled', (data: any) => {
      options.onTransferCancelled?.(data);
    });

    newSocket.on('transfer_executed', (data: any) => {
      options.onTransferExecuted?.(data);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    setSocket(newSocket);
  }, [options.userId, options]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  const joinRoom = useCallback((roomId: string) => {
    if (socket) {
      socket.emit('join_room', { roomId });
    }
  }, [socket]);

  const leaveRoom = useCallback((roomId: string) => {
    if (socket) {
      socket.emit('leave_room', { roomId });
    }
  }, [socket]);

  const sendNotification = useCallback((userId: string, notification: any) => {
    if (socket) {
      socket.emit('send_notification', { userId, notification });
    }
  }, [socket]);

  useEffect(() => {
    if (options.userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [options.userId, connect, disconnect]);

  return {
    socket,
    isConnected,
    notifications,
    setNotifications,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendNotification
  };
};

// Hook for managing notification state
export const useNotifications = (userId?: string) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const { 
    notifications, 
    setNotifications,
    isConnected 
  } = useWebSocket({
    userId,
    onNotification: (notification) => {
      setUnreadCount(prev => prev + 1);
    }
  });

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isRead: true }))
    );
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    showNotifications,
    setShowNotifications,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    isConnected
  };
};