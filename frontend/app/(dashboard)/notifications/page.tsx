'use client';

import { useState } from 'react';
import { Bell, Check, X } from 'lucide-react';

interface AppNotification { id: string; title: string; message: string; read: boolean; timestamp: string }

const MOCK: AppNotification[] = [
  { id:'1', title:'Asset Checked Out', message:'Dell Laptop #7 checked out by Alice M.', read:false, timestamp:'2024-01-22T09:15:00Z' },
  { id:'2', title:'Maintenance Due', message:'Annual service for HVAC Unit due tomorrow', read:false, timestamp:'2024-01-22T08:00:00Z' },
  { id:'3', title:'Low Stock Alert', message:'Printer Ink Cartridges below reorder level', read:true, timestamp:'2024-01-21T14:30:00Z' },
];

export default function NotificationsPanelPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>(MOCK);
  const [panelOpen, setPanelOpen] = useState(true);
  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const dismiss = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Notifications</h1><p className="text-sm text-gray-500 mt-1">In-app notification centre</p></div>
        <div className="relative">
          <button onClick={() => setPanelOpen(o => !o)} className="relative p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <Bell size={20} className="text-gray-700"/>
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unreadCount}</span>}
          </button>
        </div>
      </div>
      {panelOpen && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">All Notifications</span>
            {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Check size={12}/>Mark all read</button>}
          </div>
          {notifications.length === 0
            ? <div className="p-10 text-center text-sm text-gray-400">No notifications</div>
            : notifications.map(n => (
              <div key={n.id} className={lex items-start justify-between px-5 py-4 border-b border-gray-100 hover:bg-gray-50 }>
                <div className="flex gap-3 cursor-pointer flex-1" onClick={() => markRead(n.id)}>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"/>}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <button onClick={() => dismiss(n.id)} className="p-1 hover:bg-gray-200 rounded ml-2"><X size={14} className="text-gray-400"/></button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}