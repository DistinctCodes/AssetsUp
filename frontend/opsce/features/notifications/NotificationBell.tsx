'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, X, CheckCheck, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/auth.store';
import { useWebSocket } from '@/hooks/useWebSocket';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'maintenance' | 'transfer' | 'system' | 'alert';
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'opsce_notifications';

function loadNotifications(): Notification[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifications: Notification[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // Ignore storage errors
  }
}

const priorityColors: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
};

const typeIcons: Record<string, string> = {
  maintenance: '🔧',
  transfer: '↔️',
  system: '⚙️',
  alert: '⚠️',
};

export function NotificationBell() {
  const userId = useAuthStore((s) => s.user?.id);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const { isConnected } = useWebSocket({
    userId,
    onNotification: (data) => {
      const notification: Notification = {
        id: data.id,
        title: data.title,
        message: data.message,
        type: (data.type as Notification['type']) || 'system',
        priority: (data.priority as Notification['priority']) || 'low',
        isRead: false,
        createdAt: data.createdAt || new Date().toISOString(),
      };
      setNotifications((prev) => {
        const updated = [notification, ...prev].slice(0, 50); // Keep max 50
        saveNotifications(updated);
        return updated;
      });
    },
  });

  // Load persisted notifications on mount
  useEffect(() => {
    setNotifications(loadNotifications());
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      saveNotifications(updated);
      return updated;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      saveNotifications(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    saveNotifications([]);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} />
                </button>
              )}
              <button
                onClick={clearAll}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                title="Clear all"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Connection status */}
          <div className="px-4 py-1.5 border-b border-gray-50 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-[10px] text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Notifications list */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-gray-400">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={clsx(
                    'px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors',
                    !notification.isRead && 'bg-blue-50/30',
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base shrink-0 mt-0.5">
                      {typeIcons[notification.type] || '📋'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={clsx(
                          'text-sm truncate',
                          !notification.isRead ? 'font-semibold text-gray-900' : 'text-gray-700',
                        )}>
                          {notification.title}
                        </p>
                        {notification.priority === 'high' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 5 && (
            <div className="px-4 py-2 border-t border-gray-100 text-center">
              <button className="text-xs text-gray-400 hover:text-gray-600">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
