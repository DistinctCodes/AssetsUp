"use client";

import { useState } from "react";
import { Bell, Check, CheckCheck, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  title: string;
  message?: string;
  type: "INFO" | "WARNING" | "ALERT";
  isRead: boolean;
  resourceType?: string;
  resourceId?: string;
  createdAt: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "n1", title: "Transfer Approved", message: "Your transfer request for MacBook Pro M2 has been approved.", type: "INFO", isRead: false, resourceType: "transfer", resourceId: "tr-1", createdAt: "2026-08-25T10:30:00Z" },
  { id: "n2", title: "Maintenance Due", message: "Scheduled maintenance for Dell Monitor is due in 3 days.", type: "WARNING", isRead: false, resourceType: "maintenance", createdAt: "2026-08-24T14:00:00Z" },
  { id: "n3", title: "New Asset Assigned", message: "You have been assigned a new asset: Standing Desk.", type: "INFO", isRead: true, resourceType: "asset", resourceId: "a-1", createdAt: "2026-08-22T09:00:00Z" },
  { id: "n4", title: "Transfer Rejected", message: "Your transfer request for Standing Desk was rejected.", type: "ALERT", isRead: true, resourceType: "transfer", resourceId: "tr-3", createdAt: "2026-08-20T16:00:00Z" },
];

const TYPE_ICONS: Record<string, string> = {
  INFO: "bg-blue-100 text-blue-600",
  WARNING: "bg-yellow-100 text-yellow-600",
  ALERT: "bg-red-100 text-red-600",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const filtered = filter === "all" ? notifications : notifications.filter((n) => !n.isRead);

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const getLink = (n: Notification) => {
    if (n.resourceType === "asset" && n.resourceId) return `/assets/${n.resourceId}`;
    if (n.resourceType === "transfer") return "/transfers";
    if (n.resourceType === "maintenance") return "/maintenance";
    return "#";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "All caught up"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setFilter(filter === "all" ? "unread" : "all")}>
            <Filter className="w-3.5 h-3.5 mr-1" />
            {filter === "all" ? "Show Unread" : "Show All"}
          </Button>
          {unreadCount > 0 && (
            <Button size="sm" onClick={markAllRead}>
              <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark All Read
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white border rounded-xl p-12 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => { markRead(n.id); if (n.resourceType) window.location.href = getLink(n); }}
              className={`bg-white border rounded-xl p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                n.isRead ? "opacity-60" : "hover:bg-gray-50"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${TYPE_ICONS[n.type]}`}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.isRead ? "font-normal text-gray-600" : "font-medium text-gray-900"}`}>{n.title}</p>
                {n.message && <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>}
                <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.isRead && (
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
