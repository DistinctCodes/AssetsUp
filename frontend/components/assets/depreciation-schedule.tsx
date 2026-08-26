"use client";

import { useState } from "react";
import { TrendingDown, DollarSign, BarChart3 } from "lucide-react";

interface DepreciationEntry {
  period: number;
  openingValue: number;
  depreciation: number;
  closingValue: number;
}

interface DepreciationData {
  method: string;
  usefulLifeMonths: number;
  salvageValue: number;
  purchaseCost: number;
  currentValue: number;
  schedule: DepreciationEntry[];
}

const MOCK_DATA: DepreciationData = {
  method: "STRAIGHT_LINE",
  usefulLifeMonths: 60,
  salvageValue: 500,
  purchaseCost: 5000,
  currentValue: 3200,
  schedule: Array.from({ length: 12 }, (_, i) => ({
    period: i + 1,
    openingValue: 5000 - i * 375,
    depreciation: 375,
    closingValue: 5000 - (i + 1) * 375,
  })),
};

export function DepreciationSchedule({ data = MOCK_DATA }: { data?: DepreciationData }) {
  const [expanded, setExpanded] = useState(false);
  const visibleSchedule = expanded ? data.schedule : data.schedule.slice(0, 6);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Depreciation Schedule</h3>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Purchase Cost</p>
          <p className="text-lg font-semibold">${data.purchaseCost.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Current Book Value</p>
          <p className="text-lg font-semibold">${data.currentValue.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Salvage Value</p>
          <p className="text-lg font-semibold">${data.salvageValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Simple bar chart */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Book Value Over Time</p>
        <div className="flex items-end gap-1 h-32">
          {data.schedule.map((entry) => {
            const height = (entry.closingValue / data.purchaseCost) * 100;
            return (
              <div key={entry.period} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${height}%` }}
                  title={`Period ${entry.period}: $${entry.closingValue.toLocaleString()}`}
                />
                <span className="text-[10px] text-gray-400">{entry.period}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className={`${expanded ? "" : "max-h-48 overflow-hidden"}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="text-left py-2 font-medium">Period</th>
              <th className="text-right py-2 font-medium">Opening</th>
              <th className="text-right py-2 font-medium">Depreciation</th>
              <th className="text-right py-2 font-medium">Closing</th>
            </tr>
          </thead>
          <tbody>
            {visibleSchedule.map((entry) => (
              <tr key={entry.period} className="border-b border-gray-100">
                <td className="py-2">{entry.period}</td>
                <td className="py-2 text-right">${entry.openingValue.toLocaleString()}</td>
                <td className="py-2 text-right text-red-600">-${entry.depreciation.toLocaleString()}</td>
                <td className="py-2 text-right font-medium">${entry.closingValue.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.schedule.length > 6 && (
        <button onClick={() => setExpanded(!expanded)} className="text-sm text-blue-600 hover:text-blue-800 mt-2">
          {expanded ? "Show less" : `Show all ${data.schedule.length} periods`}
        </button>
      )}
    </div>
  );
}

export function DepreciationFinancialsTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500">Total Purchase Value</span>
          </div>
          <p className="text-2xl font-bold">$125,000</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500">Current Book Value</span>
          </div>
          <p className="text-2xl font-bold">$87,500</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500">Monthly Depreciation</span>
          </div>
          <p className="text-2xl font-bold">$2,083</p>
        </div>
      </div>

      {/* Category breakdown placeholder */}
      <div className="bg-white border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4">Book Value by Category</h3>
        <div className="space-y-3">
          {[
            { name: "Electronics", value: 45000, pct: 51 },
            { name: "Furniture", value: 22000, pct: 25 },
            { name: "Vehicles", value: 15500, pct: 18 },
            { name: "Other", value: 5000, pct: 6 },
          ].map((cat) => (
            <div key={cat.name}>
              <div className="flex justify-between text-sm mb-1">
                <span>{cat.name}</span>
                <span className="text-gray-500">${cat.value.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${cat.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <DepreciationSchedule />
    </div>
  );
}
