'use client';

import { useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConsumableItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  reorderLevel: number;
  unit: string;
  lastRestocked: string;
}

const MOCK: ConsumableItem[] = [
  { id: '1', name: 'A4 Paper Ream', category: 'Stationery', currentStock: 15, reorderLevel: 20, unit: 'Reams', lastRestocked: '2024-01-10' },
  { id: '2', name: 'Printer Ink Cartridge', category: 'Consumables', currentStock: 8, reorderLevel: 5, unit: 'Units', lastRestocked: '2024-01-18' },
  { id: '3', name: 'Sanitiser Bottles', category: 'Hygiene', currentStock: 3, reorderLevel: 10, unit: 'Bottles', lastRestocked: '2024-01-05' },
];

export default function InventoryPage() {
  const [items] = useState<ConsumableItem[]>(MOCK);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory &amp; Stock</h1>
          <p className="text-sm text-gray-500 mt-1">Consumables with reorder alerts</p>
        </div>
        <Button><Plus size={16} className="mr-1.5" />Add Item</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {['Item','Category','Stock','Reorder Level','Unit','Status','Last Restocked'].map(col => (
                <th key={col} className="text-left px-4 py-3 font-medium text-gray-500">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const low = item.currentStock <= item.reorderLevel;
              return (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-gray-600">{item.category}</td>
                  <td className="px-4 py-3 text-gray-600">{item.currentStock}</td>
                  <td className="px-4 py-3 text-gray-600">{item.reorderLevel}</td>
                  <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                  <td className="px-4 py-3">
                    {low
                      ? <span className="flex items-center gap-1 text-red-600 text-xs font-medium"><AlertTriangle size={13}/>Reorder</span>
                      : <span className="text-green-600 text-xs font-medium">OK</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.lastRestocked}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}