'use client';

import { useState } from 'react';
import { Plus, Copy, Trash2, Eye, EyeOff, Webhook } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface APIKey { id: string; name: string; key: string; created: string; lastUsed: string }
interface WebhookConfig { id: string; url: string; events: string[]; active: boolean }

const MOCK_KEYS: APIKey[] = [
  { id:'1', name:'Production App', key:'sk_live_xxxx...abc1', created:'2024-01-01', lastUsed:'2024-01-22' },
  { id:'2', name:'Staging', key:'sk_test_xxxx...def2', created:'2024-01-10', lastUsed:'2024-01-20' },
];
const MOCK_HOOKS: WebhookConfig[] = [
  { id:'1', url:'https://myapp.io/webhook', events:['asset.created','asset.updated'], active:true },
];

export default function DeveloperPortalPage() {
  const [keys] = useState<APIKey[]>(MOCK_KEYS);
  const [hooks] = useState<WebhookConfig[]>(MOCK_HOOKS);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const toggle = (id: string) => setRevealed(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Developer Portal</h1><p className="text-sm text-gray-500 mt-1">API key management and webhook configuration</p></div>
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">API Keys</h2>
            <Button size="sm"><Plus size={14} className="mr-1"/>New Key</Button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 bg-gray-50">{["Name","Key","Created","Last Used","Actions"].map(h=><th key={h} className="text-left px-4 py-3 font-medium text-gray-500">{h}</th>)}</tr></thead>
            <tbody>{keys.map(k=>(
              <tr key={k.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{k.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{revealed.has(k.id) ? k.key : '••••••••••••••••'}</td>
                <td className="px-4 py-3 text-gray-500">{k.created}</td>
                <td className="px-4 py-3 text-gray-500">{k.lastUsed}</td>
                <td className="px-4 py-3 flex items-center gap-2">
                  <button onClick={() => toggle(k.id)} className="text-gray-400 hover:text-gray-700">{revealed.has(k.id) ? <EyeOff size={14}/> : <Eye size={14}/>}</button>
                  <button className="text-gray-400 hover:text-gray-700"><Copy size={14}/></button>
                  <button className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Webhook size={16}/>Webhooks</h2>
            <Button size="sm"><Plus size={14} className="mr-1"/>Add Webhook</Button>
          </div>
          {hooks.map(w=>(
            <div key={w.id} className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
              <div><p className="text-sm font-medium text-gray-900">{w.url}</p><p className="text-xs text-gray-500 mt-0.5">{w.events.join(', ')}</p></div>
              <span className={px-2 py-0.5 rounded-full text-xs font-medium }>{w.active?'Active':'Inactive'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}