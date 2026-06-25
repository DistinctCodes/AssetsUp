'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ALL_COLUMNS = ['Asset ID', 'Name', 'Category', 'Status', 'Department', 'Assigned To', 'Purchase Date', 'Cost'];

interface Row { id: string; assetId: string; name: string; category: string; status: string; department: string; assignedTo: string; purchaseDate: string; cost: string }
const MOCK: Row[] = [
  { id:'1', assetId:'AST-001', name:'Dell Laptop', category:'IT', status:'ACTIVE', department:'Engineering', assignedTo:'John D.', purchaseDate:'2023-01-01', cost:',200' },
  { id:'2', assetId:'AST-002', name:'HP Monitor', category:'IT', status:'ASSIGNED', department:'Design', assignedTo:'Jane S.', purchaseDate:'2023-03-15', cost:'' },
];

export default function AdvancedReportsPage() {
  const [selected, setSelected] = useState<string[]>(ALL_COLUMNS.slice(0,5));
  const [from, setFrom] = useState('2024-01-01');
  const [to, setTo] = useState('2024-12-31');

  const toggle = (col: string) => setSelected(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Advanced Reports</h1><p className="text-sm text-gray-500 mt-1">Custom column picker and date range</p></div>
        <Button><Download size={16} className="mr-1.5" />Export CSV</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-4 items-end">
        <div><label className="text-xs font-medium text-gray-500 block mb-1">From</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"/></div>
        <div><label className="text-xs font-medium text-gray-500 block mb-1">To</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"/></div>
        <div className="flex flex-wrap gap-2">{ALL_COLUMNS.map(col=><label key={col} className="flex items-center gap-1 text-sm cursor-pointer"><input type="checkbox" checked={selected.includes(col)} onChange={()=>toggle(col)} className="rounded"/>{col}</label>)}</div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 bg-gray-50">{selected.map(h=><th key={h} className="text-left px-4 py-3 font-medium text-gray-500">{h}</th>)}</tr></thead>
          <tbody>{MOCK.map(row=><tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">{selected.map(col=>{const k=col.toLowerCase().replace(/ /g,'') as keyof Row; return <td key={col} className="px-4 py-3 text-gray-600">{row[k]??'—'}</td>})}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}