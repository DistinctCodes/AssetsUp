'use client';

import { useState } from 'react';
import { Plus, Wrench, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type WOStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'OVERDUE';
interface WorkOrder { id: string; title: string; asset: string; assignee: string; priority: 'LOW'|'MEDIUM'|'HIGH'; status: WOStatus; dueDate: string }

const MOCK: WorkOrder[] = [
  { id:'1', title:'Replace faulty keyboard', asset:'Dell Laptop #3', assignee:'Tech Team', priority:'HIGH', status:'IN_PROGRESS', dueDate:'2024-01-25' },
  { id:'2', title:'Annual servicing', asset:'HVAC Unit', assignee:'Facilities', priority:'MEDIUM', status:'OPEN', dueDate:'2024-02-01' },
  { id:'3', title:'Battery replacement', asset:'UPS Unit A', assignee:'IT Ops', priority:'LOW', status:'DONE', dueDate:'2024-01-18' },
];

const STATUS_ICON: Record<WOStatus, React.ReactNode> = {
  OPEN:<Clock size={14} className="text-gray-400"/>, IN_PROGRESS:<Wrench size={14} className="text-blue-500"/>,
  DONE:<CheckCircle size={14} className="text-green-500"/>, OVERDUE:<AlertCircle size={14} className="text-red-500"/>
};
const PRIORITY_STYLE: Record<string, string> = { LOW:'text-gray-500', MEDIUM:'text-yellow-600', HIGH:'text-red-600' };

export default function WorkOrdersPage() {
  const [orders] = useState<WorkOrder[]>(MOCK);
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Work Orders</h1><p className="text-sm text-gray-500 mt-1">Create, assign, and track maintenance work orders</p></div>
        <Button><Plus size={16} className="mr-1.5"/>New Work Order</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 bg-gray-50">{["Title","Asset","Assignee","Priority","Status","Due Date"].map(h=><th key={h} className="text-left px-4 py-3 font-medium text-gray-500">{h}</th>)}</tr></thead>
          <tbody>
            {orders.map(o=>(
              <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3 font-medium text-gray-900">{o.title}</td>
                <td className="px-4 py-3 text-gray-600">{o.asset}</td>
                <td className="px-4 py-3 text-gray-600">{o.assignee}</td>
                <td className={px-4 py-3 font-medium }>{o.priority}</td>
                <td className="px-4 py-3"><span className="flex items-center gap-1">{STATUS_ICON[o.status]}{o.status.replace('_',' ')}</span></td>
                <td className="px-4 py-3 text-gray-500">{o.dueDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}