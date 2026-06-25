'use client';

import { useState } from 'react';
import { Plus, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BorrowRecord { id: string; asset: string; borrowedBy: string; checkedOut: string; dueDate: string; returned: boolean }

const MOCK: BorrowRecord[] = [
  { id:'1', asset:'Dell Laptop #7', borrowedBy:'Emma W.', checkedOut:'2024-01-15', dueDate:'2024-01-22', returned:false },
  { id:'2', asset:'Canon Camera', borrowedBy:'Liam T.', checkedOut:'2024-01-10', dueDate:'2024-01-17', returned:true },
  { id:'3', asset:'iPad Pro', borrowedBy:'Sophia R.', checkedOut:'2024-01-20', dueDate:'2024-01-27', returned:false },
];

export default function CheckInOutPage() {
  const [records, setRecords] = useState<BorrowRecord[]>(MOCK);

  const markReturned = (id: string) => setRecords(prev => prev.map(r => r.id === id ? { ...r, returned: true } : r));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Check-in / Check-out</h1><p className="text-sm text-gray-500 mt-1">Borrow assets with due dates and return flow</p></div>
        <Button><Plus size={16} className="mr-1.5" />Check Out Asset</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200 bg-gray-50">{["Asset","Borrowed By","Checked Out","Due Date","Status","Action"].map(h=><th key={h} className="text-left px-4 py-3 font-medium text-gray-500">{h}</th>)}</tr></thead>
          <tbody>
            {records.map(r => {
              const overdue = !r.returned && new Date(r.dueDate) < new Date();
              return (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.asset}</td>
                  <td className="px-4 py-3 text-gray-600">{r.borrowedBy}</td>
                  <td className="px-4 py-3 text-gray-500">{r.checkedOut}</td>
                  <td className={px-4 py-3 }>{r.dueDate}{overdue && ' (Overdue)'}</td>
                  <td className="px-4 py-3">
                    {r.returned
                      ? <span className="flex items-center gap-1 text-green-600 text-xs"><ArrowDownCircle size={13}/>Returned</span>
                      : <span className="flex items-center gap-1 text-blue-600 text-xs"><ArrowUpCircle size={13}/>Out</span>}
                  </td>
                  <td className="px-4 py-3">{!r.returned && <button onClick={() => markReturned(r.id)} className="text-xs text-blue-600 hover:underline">Mark Returned</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}