'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

const EVENTS = [
  { key:'asset_checkout', label:'Asset Checked Out' },
  { key:'asset_return', label:'Asset Returned' },
  { key:'maintenance_due', label:'Maintenance Due' },
  { key:'low_stock', label:'Low Stock Alert' },
  { key:'asset_assigned', label:'Asset Assigned to Me' },
  { key:'work_order', label:'Work Order Update' },
];

const CHANNELS = ['Email', 'In-App', 'Push'];

type Prefs = Record<string, Record<string, boolean>>;

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<Prefs>(() => {
    const init: Prefs = {};
    EVENTS.forEach(e => { init[e.key] = { Email: true, 'In-App': true, Push: false }; });
    return init;
  });

  const toggle = (event: string, channel: string) =>
    setPrefs(prev => ({ ...prev, [event]: { ...prev[event], [channel]: !prev[event][channel] } }));

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Notification Preferences</h1><p className="text-sm text-gray-500 mt-1">Per-event channel toggles</p></div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-3 font-medium text-gray-500">Event</th>
            {CHANNELS.map(c => <th key={c} className="text-center px-4 py-3 font-medium text-gray-500">{c}</th>)}
          </tr></thead>
          <tbody>
            {EVENTS.map(ev => (
              <tr key={ev.key} className="border-b border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900">{ev.label}</td>
                {CHANNELS.map(ch => (
                  <td key={ch} className="px-4 py-3 text-center">
                    <input type="checkbox" checked={prefs[ev.key][ch]} onChange={() => toggle(ev.key, ch)} className="rounded cursor-pointer" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4"><Button>Save Preferences</Button></div>
    </div>
  );
}