'use client';

import { useState } from 'react';
import { Plus, BarChart3, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AuditStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETE';
interface Audit { id: string; name: string; department: string; scheduledDate: string; status: AuditStatus; total: number; scanned: number; discrepancies: number }

const MOCK: Audit[] = [
  { id:'1', name:'Q1 IT Audit', department:'Engineering', scheduledDate:'2024-01-30', status:'IN_PROGRESS', total:45, scanned:32, discrepancies:3 },
  { id:'2', name:'Annual Furniture Check', department:'All', scheduledDate:'2024-02-15', status:'SCHEDULED', total:120, scanned:0, discrepancies:0 },
  { id:'3', name:'Q4 2023 Audit', department:'Admin', scheduledDate:'2023-12-20', status:'COMPLETE', total:30, scanned:30, discrepancies:1 },
];

const STATUS_BADGE: Record<AuditStatus, string> = { SCHEDULED:'bg-gray-100 text-gray-600', IN_PROGRESS:'bg-blue-50 text-blue-700', COMPLETE:'bg-green-50 text-green-700' };

export default function StocktakePage() {
  const [audits] = useState<Audit[]>(MOCK);
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Stocktake</h1><p className="text-sm text-gray-500 mt-1">Schedule audits, scan assets, review discrepancies</p></div>
        <Button><Plus size={16} className="mr-1.5"/>Schedule Audit</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 bg-gray-50">{["Audit Name","Department","Date","Status","Progress","Discrepancies"].map(h=><th key={h} className="text-left px-4 py-3 font-medium text-gray-500">{h}</th>)}</tr></thead>
          <tbody>
            {audits.map(a => {
              const pct = a.total > 0 ? Math.round((a.scanned / a.total) * 100) : 0;
              return (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                  <td className="px-4 py-3 text-gray-600">{a.department}</td>
                  <td className="px-4 py-3 text-gray-500">{a.scheduledDate}</td>
                  <td className="px-4 py-3"><span className={px-2 py-0.5 rounded-full text-xs font-medium }>{a.status.replace('_',' ')}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-200 rounded-full"><div className="h-1.5 bg-blue-500 rounded-full" style={{width:${pct}%}}/></div>
                      <span className="text-xs text-gray-500">{a.scanned}/{a.total}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {a.discrepancies > 0
                      ? <span className="flex items-center gap-1 text-red-600 text-xs"><AlertTriangle size={13}/>{a.discrepancies}</span>
                      : <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle size={13}/>None</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}