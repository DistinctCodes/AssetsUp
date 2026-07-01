'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Package, CheckCircle2, UserCheck, Wrench } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useReportsSummary } from '@/lib/query/hooks/useReports';
import { StatusBadge } from '@/components/assets/status-badge';
import { AssetStatus } from '@/lib/query/types/asset';

const statCards = [
  { label: 'Total Assets',    key: 'total',       icon: Package,      status: null },
  { label: 'Active',          key: 'active',      icon: CheckCircle2, status: AssetStatus.ACTIVE },
  { label: 'Assigned',        key: 'assigned',    icon: UserCheck,    status: AssetStatus.ASSIGNED },
  { label: 'In Maintenance',  key: 'maintenance', icon: Wrench,       status: AssetStatus.MAINTENANCE },
] as const;

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

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError } = useReportsSummary();

  const counts = {
    total:       data?.total ?? 0,
    active:      data?.byStatus?.[AssetStatus.ACTIVE] ?? 0,
    assigned:    data?.byStatus?.[AssetStatus.ASSIGNED] ?? 0,
    maintenance: data?.byStatus?.[AssetStatus.MAINTENANCE] ?? 0,
  };

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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                data.recent.map((asset) => (
                  <tr
                    key={asset.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => window.location.href = `/assets/${asset.id}`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{asset.name}</td>
                    <td className="px-4 py-3 text-gray-500">{asset.assetId}</td>
                    <td className="px-4 py-3"><StatusBadge status={asset.status} /></td>
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
    </div>
  );
}
