'use client';

import { useMemo, useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  Filter,
  Info,
  Trash2,
  X,
} from 'lucide-react';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  type: 'info' | 'warning' | 'success';
}

const MOCK: AppNotification[] = [
  {
    id: '1',
    title: 'Asset Checked Out',
    message: 'Dell Laptop #7 checked out by Alice M.',
    read: false,
    timestamp: '2024-01-22T09:15:00Z',
    type: 'success',
  },
  {
    id: '2',
    title: 'Maintenance Due',
    message: 'Annual service for HVAC Unit due tomorrow.',
    read: false,
    timestamp: '2024-01-22T08:00:00Z',
    type: 'warning',
  },
  {
    id: '3',
    title: 'Low Stock Alert',
    message: 'Printer Ink Cartridges below reorder level.',
    read: true,
    timestamp: '2024-01-21T14:30:00Z',
    type: 'info',
  },
];

type FilterType = 'all' | 'unread' | 'read';

export default function NotificationsPanelPage() {
  const [notifications, setNotifications] =
    useState<AppNotification[]>(MOCK);

  const [panelOpen, setPanelOpen] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case 'read':
        return notifications.filter((n) => n.read);

      case 'unread':
        return notifications.filter((n) => !n.read);

      default:
        return notifications;
    }
  }, [notifications, filter]);

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    );
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read: !n.read } : n
      )
    );
  };

  const markAllRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        read: true,
      }))
    );
  };

  const dismiss = (id: string) => {
    setNotifications((prev) =>
      prev.filter((n) => n.id !== id)
    );
  };

  const formatTime = (date: string) => {
    const diff =
      Date.now() - new Date(date).getTime();

    const mins = Math.floor(diff / 60000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;

    const hrs = Math.floor(mins / 60);

    if (hrs < 24) return `${hrs}h ago`;

    const days = Math.floor(hrs / 24);

    return `${days}d ago`;
  };

  const icon = (type: AppNotification['type']) => {
    switch (type) {
      case 'success':
        return (
          <CheckCheck
            size={18}
            className="text-green-500"
          />
        );

      case 'warning':
        return (
          <Clock
            size={18}
            className="text-amber-500"
          />
        );

      default:
        return (
          <Info
            size={18}
            className="text-blue-500"
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Notifications
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Stay updated with recent activity
          </p>
        </div>

        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="relative rounded-xl border bg-white p-3 shadow-sm hover:bg-gray-50 transition"
        >
          <Bell size={22} />

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {panelOpen && (
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">

          {/* Toolbar */}

          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div className="flex gap-2">
              {(['all', 'unread', 'read'] as FilterType[]).map(
                (item) => (
                  <button
                    key={item}
                    onClick={() => setFilter(item)}
                    className={`rounded-full px-4 py-1.5 text-sm transition ${
                      filter === item
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {item.charAt(0).toUpperCase() +
                      item.slice(1)}
                  </button>
                )
              )}
            </div>

            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <Check size={15} />
                  Mark all read
                </button>
              )}

              <button className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                <Filter size={15} />
                Filter
              </button>
            </div>
          </div>

          {/* Notifications */}

          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Bell
                className="text-gray-300"
                size={48}
              />

              <p className="mt-4 text-gray-500">
                No notifications found
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                className={`group flex items-start justify-between gap-4 border-b p-5 transition hover:bg-gray-50 ${
                  !n.read ? 'bg-blue-50/40' : ''
                }`}
              >
                <div
                  className="flex flex-1 cursor-pointer gap-4"
                  onClick={() => markRead(n.id)}
                >
                  <div className="mt-1">
                    {icon(n.type)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">
                        {n.title}
                      </h3>

                      {!n.read && (
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </div>

                    <p className="mt-1 text-sm text-gray-600">
                      {n.message}
                    </p>

                    <p className="mt-2 text-xs text-gray-400">
                      {formatTime(n.timestamp)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() =>
                      toggleRead(n.id)
                    }
                    className="rounded-lg p-2 hover:bg-gray-200"
                  >
                    <Check
                      size={16}
                    />
                  </button>

                  <button
                    onClick={() =>
                      dismiss(n.id)
                    }
                    className="rounded-lg p-2 hover:bg-red-100"
                  >
                    <Trash2
                      size={16}
                      className="text-red-500"
                    />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}