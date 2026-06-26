'use client';

import { useState } from 'react';

interface DepreciationRow {
  id: string;
  assetName: string;
  purchaseDate: string;
  purchaseCost: number;
  usefulLifeYears: number;
  bookValue: number;
  annualDepreciation: number;
}

const MOCK: DepreciationRow[] = [
  { id: '1', assetName: 'Dell Laptop #1', purchaseDate: '2022-01-01', purchaseCost: 1200, usefulLifeYears: 4, bookValue: 600, annualDepreciation: 300 },
  { id: '2', assetName: 'HP Printer', purchaseDate: '2021-06-15', purchaseCost: 800, usefulLifeYears: 5, bookValue: 320, annualDepreciation: 160 },
  { id: '3', assetName: 'Office Chair', purchaseDate: '2023-03-01', purchaseCost: 400, usefulLifeYears: 7, bookValue: 343, annualDepreciation: 57 },
];

export default function DepreciationPage() {
  const [rows] = useState<DepreciationRow[]>(MOCK);
  const totalBookValue = rows.reduce((s, r) => s + r.bookValue, 0);
  const totalDepreciation = rows.reduce((s, r) => s + r.annualDepreciation, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Depreciation Report</h1>
        <p className="text-sm text-gray-500 mt-1">Schedule table and book value per asset</p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Book Value</p>
          <p className="text-3xl font-bold text-gray-900 mt-1"></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Annual Depreciation</p>
          <p className="text-3xl font-bold text-gray-900 mt-1"></p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {['Asset','Purchase Date','Cost','Useful Life','Book Value','Annual Dep.','Dep. %'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{r.assetName}</td>
                <td className="px-4 py-3 text-gray-600">{r.purchaseDate}</td>
                <td className="px-4 py-3 text-gray-600"></td>
                <td className="px-4 py-3 text-gray-600">{r.usefulLifeYears}y</td>
                <td className="px-4 py-3 font-medium text-gray-900"></td>
                <td className="px-4 py-3 text-gray-600">/yr</td>
                <td className="px-4 py-3 text-gray-600">{Math.round((r.annualDepreciation / r.purchaseCost) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}