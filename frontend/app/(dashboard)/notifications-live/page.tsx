'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Wifi, WifiOff } from 'lucide-react';

interface Notification { id: string; message: string; type: 'info' | 'warning' | 'success'; timestamp: string }

export default function NotificationsRealtimePage() {
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id:'1', message:'Asset AST-042 has been checked out by Alice M.', type:'info', timestamp: new Date().toISOString() },
    { id:'2', message:'Maintenance scheduled for Server Rack A on Jan 25', type:'warning', timestamp: new Date().toISOString() },
  ]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = (process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001') + '/notifications';
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => setConnected(false);
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data as string) as Notification;
          setNotifications(prev => [data, ...prev].slice(0, 50));
        } catch { /* ignore malformed */ }
      };
    } catch { /* ws not available in test env */ }
    return () => { wsRef.current?.close(); };
  }, []);

  const TYPE_STYLE: Record<string, string> = { info:'border-blue-200 bg-blue-50', warning:'border-yellow-200 bg-yellow-50', success:'border-green-200 bg-green-50' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Real-time Notifications</h1><p className="text-sm text-gray-500 mt-1">Live updates via WebSocket</p></div>
        <span className={lex items-center gap-1.5 text-sm }>
          {connected ? <Wifi size={16}/> : <WifiOff size={16}/>}{connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      <div className="space-y-3">
        {notifications.length === 0
          ? <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-400"><Bell size={24} className="mx-auto mb-2 text-gray-300"/>No notifications yet</div>
          : notifications.map(n => (
            <div key={n.id} className={ounded-xl border p-4 }>
              <p className="text-sm text-gray-800">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
            </div>
          ))}
      </div>
    </div>
  );
}