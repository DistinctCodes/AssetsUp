import { api } from '../api';

export interface NotificationItem {
  id: string;
  title: string;
  message?: string;
  type: 'INFO' | 'WARNING' | 'ALERT';
  isRead: boolean;
  resourceType?: string;
  resourceId?: string;
  createdAt: string;
}

export const notificationsApiClient = {
  list: (): Promise<NotificationItem[]> =>
    api.get<NotificationItem[]>('/notifications').then((r) => r.data),

  getUnreadCount: (): Promise<{ count: number }> =>
    api.get<{ count: number }>('/notifications/unread-count').then((r) => r.data),

  markRead: (id: string): Promise<void> =>
    api.patch(`/notifications/${id}/read`).then(() => undefined),

  markAllRead: (): Promise<void> =>
    api.patch('/notifications/mark-all-read').then(() => undefined),
};