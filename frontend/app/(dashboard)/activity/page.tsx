'use client';

import { useState } from 'react';
import { Package, UserCheck, Wrench, AlertTriangle, Settings } from 'lucide-react';

type EventType = 'checkout' | 'return' | 'maintenance' | 'alert' | 'system';

interface ActivityEvent { id: string; type: EventType; actor: string; description: string; timestamp: string }

const MOCK: ActivityEvent[] = [
  { id:'1', type:'checkout', actor:'Alice M.', description:'checked out Dell Laptop #7', timestamp:'2024-01-22T09:15:00Z' },
  { id:'2', type:'maintenance', actor:'Tech Team', description:'completed maintenance on Server Rack A', timestamp:'2024-01-22T08:30:00Z' },
  { id:'3', type:'alert', actor:'System', description:'Printer Ink stock fell below reorder level', timestamp:'2024-01-22T07:45:00Z' },
  { id:'4', type:'return', actor:'Bob K.', description:'returned Canon Camera', timestamp:'2024-01-21T17:00:00Z' },
  { id:'5', type:'system', actor:'Admin', description:'updated permissions for Manager role', timestamp:'2024-01-21T14:20:00Z' },
];

const ICON: Record<EventType, React.ReactNode> = {
  checkout: <Package size={16} className="text-blue-500"/>,
  return:   <UserCheck size={16} className="text-green-500"/>,
  maintenance: <Wrench size={16} className="text-yellow-500"/>,
  alert:    <AlertTriangle size={16} className="text-red-500"/>,
  system:   <Settings size={16} className="text-gray-400"/>,
};

export default function ActivityFeedPage() {
  const [events] = useState<ActivityEvent[]>(MOCK);
  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1><p className="text-sm text-gray-500 mt-1">Org-wide timeline of asset and system events</p></div>
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200" />
        <div className="space-y-4 pl-14">
          {events.map(ev => (
            <div key={ev.id} className="relative bg-white rounded-xl border border-gray-200 p-4">
              <div className="absolute -left-8 top-4 flex items-center justify-center w-8 h-8 bg-white border border-gray-200 rounded-full">{ICON[ev.type]}</div>
              <p className="text-sm text-gray-900"><span className="font-medium">{ev.actor}</span> {ev.description}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(ev.timestamp).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}