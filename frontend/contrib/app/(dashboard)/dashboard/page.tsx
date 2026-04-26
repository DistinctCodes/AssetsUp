'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Package, CheckCircle2, UserCheck, Wrench } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useReportsSummary } from '@/lib/query';
import { StatusBadge } from '@/contrib/components/assets/status-badge';
import type { Asset, ReportsSummary } from '@/contrib/lib/query/types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const statCards = [
  { label: 'Total Assets', key: 'total', icon: Package, status: null },
  { label: 'Active', key: 'active', icon: CheckCircle2, status: 'ACTIVE' },
  { label: 'Assigned', key: 'assigned', icon: UserCheck, status: 'ASSIGNED' },
  { label: 'In Maintenance', key: 'maintenance', icon: Wrench, status: 'MAINTENANCE' },
] as const;

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

function StatSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
      <div className="h-8 w-16 bg-gray-200 rounded" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <tr className="animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
      <div className="h-64 w-full bg-gray-200 rounded" />
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError } = useReportsSummary();

  const counts = {
    total: data?.total ?? 0,
    active: data?.byStatus?.['ACTIVE'] ?? 0,
    assigned: data?.byStatus?.['ASSIGNED'] ?? 0,
    maintenance: data?.byStatus?.['MAINTENANCE'] ?? 0,
  };

  // Prepare trend data for line chart
  const trendData = (data?.monthlyTrends ?? []).map((item: { month: string; count: number }) => ({
    month: format(new Date(item.month), 'MMM yyyy'),
    count: item.count,
  }));

  // Prepare status breakdown for donut chart
  const statusData = Object.entries(data?.byStatus ?? {}).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user ? `, ${user.firstName}` : ''}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Here&apos;s an overview of your assets</p>
      </div>

      {/* Stat cards */}
      {isError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6 text-sm text-red-600">
          Failed to load summary data. Please try refreshing the page.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {isLoading
            ? statCards.map((s) => <StatSkeleton key={s.key} />)
            : statCards.map(({ label, key, icon: Icon, status }) => (
                <Link
                  key={key}
                  href={status ? `/assets?status=${status}` : '/assets'}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-500">{label}</p>
                    <Icon size={18} className="text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{counts[key]}</p>
                </Link>
              ))}
        </div>
      )}

      {/* Recent assets table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent Assets</h2>
          <Link href="/assets" className="text-xs text-gray-500 hover:text-gray-900 hover:underline">
            View all assets
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Asset ID</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Department</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
              ) : !data?.recent?.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                    No assets yet.{' '}
                    <Link href="/assets" className="text-gray-900 underline">
                      Register your first asset
                    </Link>
                  </td>
                </tr>
              ) : (
                data.recent.map((asset: Asset) => (
                  <tr
                    key={asset.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => (window.location.href = `/assets/${asset.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{asset.name}</td>
                    <td className="px-4 py-3 text-gray-500">{asset.assetId}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={asset.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{asset.department?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {format(new Date(asset.createdAt), 'MMM d, yyyy')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Section */}
      {isError ? null : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Asset Trend Line Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Asset Trend (Last 12 Months)</h2>
            {isLoading ? (
              <ChartSkeleton />
            ) : trendData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                No trend data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Status Breakdown Donut Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Asset Status Breakdown</h2>
            {isLoading ? (
              <ChartSkeleton />
            ) : statusData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                No status data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            {/* Legend */}
            {!isLoading && statusData.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-4 justify-center">
                {statusData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-gray-600">
                      {item.name} ({item.value})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
