'use client';

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Filters { status: string; category: string; department: string; condition: string; from: string; to: string }

const ASSETS = [
  { id:'1', name:'Dell Laptop #1', status:'ACTIVE', category:'IT', department:'Engineering', condition:'GOOD', createdAt:'2023-01-10' },
  { id:'2', name:'HP Monitor', status:'ASSIGNED', category:'IT', department:'Design', condition:'FAIR', createdAt:'2023-03-15' },
  { id:'3', name:'Office Chair', status:'ACTIVE', category:'Furniture', department:'HR', condition:'GOOD', createdAt:'2023-02-01' },
];

export default function AdvancedFilterPage() {
  const [open, setOpen] = useState(true);
  const [filters, setFilters] = useState<Filters>({ status:'', category:'', department:'', condition:'', from:'', to:'' });

  const set = (k: keyof Filters, v: string) => setFilters(f => ({ ...f, [k]: v }));
  const reset = () => setFilters({ status:'', category:'', department:'', condition:'', from:'', to:'' });

  const filtered = ASSETS.filter(a =>
    (!filters.status || a.status === filters.status) &&
    (!filters.category || a.category === filters.category) &&
    (!filters.department || a.department === filters.department) &&
    (!filters.condition || a.condition === filters.condition)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Assets</h1><p className="text-sm text-gray-500 mt-1">{filtered.length} results</p></div>
        <Button variant="outline" onClick={()=>setOpen(o=>!o)}><SlidersHorizontal size={16} className="mr-1.5"/>Filters</Button>
      </div>
      <div className="flex gap-4">
        {open && (
          <aside className="w-56 shrink-0 bg-white rounded-xl border border-gray-200 p-4 space-y-4 h-fit">
            <div className="flex items-center justify-between"><span className="text-sm font-semibold text-gray-900">Filters</span><button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5"><X size={12}/>Reset</button></div>
            {([['Status',['ACTIVE','ASSIGNED','MAINTENANCE','DISPOSED'],'status'],['Category',['IT','Furniture','Vehicles','Equipment'],'category'],['Department',['Engineering','Design','HR','Admin'],'department'],['Condition',['GOOD','FAIR','POOR'],'condition']] as [string,string[],keyof Filters][]).map(([label,opts,key])=>(
              <div key={key}><label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
              <select value={filters[key]} onChange={e=>set(key,e.target.value)} className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900">
                <option value="">All</option>{opts.map(o=><option key={o} value={o}>{o}</option>)}
              </select></div>
            ))}
            <div><label className="text-xs font-medium text-gray-500 block mb-1">Created From</label><input type="date" value={filters.from} onChange={e=>set('from',e.target.value)} className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none"/></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1">Created To</label><input type="date" value={filters.to} onChange={e=>set('to',e.target.value)} className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none"/></div>
          </aside>
        )}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden h-fit">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 bg-gray-50">{["Name","Status","Category","Department","Condition"].map(h=><th key={h} className="text-left px-4 py-3 font-medium text-gray-500">{h}</th>)}</tr></thead>
            <tbody>{filtered.length === 0
              ? <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No assets match the current filters.</td></tr>
              : filtered.map(a=><tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50"><td className="px-4 py-3 font-medium text-gray-900">{a.name}</td><td className="px-4 py-3 text-gray-600">{a.status}</td><td className="px-4 py-3 text-gray-600">{a.category}</td><td className="px-4 py-3 text-gray-600">{a.department}</td><td className="px-4 py-3 text-gray-600">{a.condition}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}