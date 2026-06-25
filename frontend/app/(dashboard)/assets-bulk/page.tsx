'use client';

import { useState } from 'react';
import { Trash2, Tag, UserCheck, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Asset { id: string; assetId: string; name: string; category: string; status: string; department: string }

const MOCK: Asset[] = [
  { id:'1', assetId:'AST-001', name:'Dell Laptop #1', category:'IT', status:'ACTIVE', department:'Engineering' },
  { id:'2', assetId:'AST-002', name:'HP Monitor', category:'IT', status:'ASSIGNED', department:'Design' },
  { id:'3', assetId:'AST-003', name:'Office Chair', category:'Furniture', status:'ACTIVE', department:'HR' },
  { id:'4', assetId:'AST-004', name:'Canon Printer', category:'IT', status:'MAINTENANCE', department:'Admin' },
];

export default function BulkAssetsPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleAll = () => setSelected(prev => prev.size === MOCK.length ? new Set() : new Set(MOCK.map(a=>a.id)));
  const toggleOne = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Assets</h1><p className="text-sm text-gray-500 mt-1">{MOCK.length} assets</p></div>
      </div>
      {selected.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
          <span className="text-sm font-medium text-blue-900">{selected.size} selected</span>
          <Button size="sm" variant="outline" className="gap-1"><UserCheck size={14}/>Assign</Button>
          <Button size="sm" variant="outline" className="gap-1"><Tag size={14}/>Tag</Button>
          <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200 hover:bg-red-50"><Trash2 size={14}/>Delete</Button>
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 w-8"><input type="checkbox" checked={selected.size === MOCK.length} onChange={toggleAll} className="rounded"/></th>
            {["Asset ID","Name","Category","Status","Department"].map(h=><th key={h} className="text-left px-4 py-3 font-medium text-gray-500">{h}</th>)}
          </tr></thead>
          <tbody>
            {MOCK.map(a=>(
              <tr key={a.id} className={order-b border-gray-100 hover:bg-gray-50 } onClick={()=>toggleOne(a.id)}>
                <td className="px-4 py-3"><input type="checkbox" checked={selected.has(a.id)} onChange={()=>toggleOne(a.id)} className="rounded" onClick={e=>e.stopPropagation()}/></td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.assetId}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                <td className="px-4 py-3 text-gray-600">{a.category}</td>
                <td className="px-4 py-3 text-gray-600">{a.status}</td>
                <td className="px-4 py-3 text-gray-600">{a.department}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected.size > 0 && <div className="mt-2 flex items-center gap-1 text-xs text-gray-400"><CheckSquare size={12}/>{selected.size} of {MOCK.length} rows selected</div>}
    </div>
  );
}