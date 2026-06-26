'use client';

import { useState } from 'react';
import { Plus, CheckCircle, Clock, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

type POStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'RECEIVED';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: string;
  item: string;
  quantity: number;
  totalCost: number;
  status: POStatus;
  createdAt: string;
}

const MOCK: PurchaseOrder[] = [
  { id: '1', poNumber: 'PO-001', vendor: 'Dell Inc.', item: 'Laptop x10', quantity: 10, totalCost: 12000, status: 'APPROVED', createdAt: '2024-01-15' },
  { id: '2', poNumber: 'PO-002', vendor: 'HP Ltd.', item: 'Monitor x5', quantity: 5, totalCost: 2500, status: 'PENDING', createdAt: '2024-01-20' },
  { id: '3', poNumber: 'PO-003', vendor: 'Logitech', item: 'Mouse x20', quantity: 20, totalCost: 600, status: 'RECEIVED', createdAt: '2024-01-22' },
];

const STATUS_ICON: Record<POStatus, React.ReactNode> = {
  DRAFT: <Clock size={14} className="text-gray-400" />, 
  PENDING: <Clock size={14} className="text-yellow-500" />,
  APPROVED: <CheckCircle size={14} className="text-blue-500" />,
  RECEIVED: <Package size={14} className="text-green-500" />,
};

export default function PurchaseOrdersPage() {
  const [orders] = useState<PurchaseOrder[]>(MOCK);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-1">{orders.length} orders</p>
        </div>
        <Button><Plus size={16} className="mr-1.5" />New Order</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {['PO Number','Vendor','Item','Qty','Total Cost','Status','Date'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{o.poNumber}</td>
                <td className="px-4 py-3 text-gray-900">{o.vendor}</td>
                <td className="px-4 py-3 text-gray-600">{o.item}</td>
                <td className="px-4 py-3 text-gray-600">{o.quantity}</td>
                <td className="px-4 py-3 text-gray-600"></td>
                <td className="px-4 py-3"><span className="flex items-center gap-1">{STATUS_ICON[o.status]}{o.status}</span></td>
                <td className="px-4 py-3 text-gray-500">{o.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}