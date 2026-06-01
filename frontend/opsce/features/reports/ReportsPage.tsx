'use client';

import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { Calendar } from 'lucide-react';
import { useReportsSummary } from '@/lib/query/hooks/useReports';
import { AssetStatus } from '@/lib/query/types/asset';
import { CardSkeleton } from '@/opsce/components/Skeletons';

const CONDITION_COLORS = ['#22c55e', '#3b82f6', '#eab308', '#ef4444', '#f97316'];

export default function ReportsPage() {
  const { data, isLoading, isError } = useReportsSummary();
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');

  const dateRangeLabel = dateRange === '7' ? '7 days' : dateRange === '30' ? '30 days' : '90 days';

  // Generate mock time-series data based on date range
  const statusOverTime = useMemo(() => {
    const days = parseInt(dateRange);
    const points = days <= 7 ? days : Math.min(days, 30);
    return Array.from({ length: points }, (_, i) => {
      const date = subDays(new Date(), points - 1 - i);
      return {
        date: format(date, 'MMM d'),
        active: Math.floor(Math.random() * 20) + 30,
        assigned: Math.floor(Math.random() * 15) + 20,
        maintenance: Math.floor(Math.random() * 5) + 2,
        retired: Math.floor(Math.random() * 3) + 1,
      };
    });
  }, [dateRange]);

  const maintenanceCostData = useMemo(() => [
    { month: 'Jan', cost: 1200, count: 3 },
    { month: 'Feb', cost: 800, count: 2 },
    { month: 'Mar', cost: 1500, count: 4 },
    { month: 'Apr', cost: 600, count: 1 },
    { month: 'May', cost: 2000, count: 5 },
    { month: 'Jun', cost: 900, count: 2 },
  ], []);

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-600">
        Failed to load reports data. Please try refreshing the page.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Asset analytics and insights</p>
        </div>

        {/* Date range filter */}
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-gray-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7' | '30' | '90')}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-700"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      {isLoading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard label="Total Assets" value={data?.total ?? 0} />
          <SummaryCard label="Active" value={data?.byStatus?.[AssetStatus.ACTIVE] ?? 0} color="text-green-600" />
          <SummaryCard label="Assigned" value={data?.byStatus?.[AssetStatus.ASSIGNED] ?? 0} color="text-blue-600" />
          <SummaryCard label="In Maintenance" value={data?.byStatus?.[AssetStatus.MAINTENANCE] ?? 0} color="text-yellow-600" />
        </div>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Asset Status Over Time */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Asset Status Over Time ({dateRangeLabel})
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={statusOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="active" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="assigned" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="maintenance" stroke="#eab308" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="retired" stroke="#9ca3af" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Maintenance Costs */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Maintenance Costs</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maintenanceCostData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                  }}
                  formatter={(value: string | number | undefined) => [`$${Number(value ?? 0).toLocaleString()}`, 'Cost']}
                />
                <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Asset Condition Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Asset Condition</h2>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'New', value: 25 },
                    { name: 'Good', value: 40 },
                    { name: 'Fair', value: 20 },
                    { name: 'Poor', value: 10 },
                    { name: 'Damaged', value: 5 },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {CONDITION_COLORS.map((color, index) => (
                    <Cell key={index} fill={color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Maintenance Assets */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Top Assets by Maintenance</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Server A', count: 8 },
                  { name: 'Laptop X', count: 6 },
                  { name: 'Printer 3', count: 5 },
                  { name: 'Switch 2', count: 4 },
                  { name: 'Monitor 7', count: 3 },
                ]}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" width={90} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SummaryCard ───────────────────────────────────────────────
function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold text-gray-900 mt-1 ${color ?? ''}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
