'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/auth.store';
import { useAssets } from '@/lib/query/hooks/useAssets';
import { StatusBadge } from '@/components/assets/status-badge';
import { AssetStatus } from '@/lib/query/types/asset';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: allAssets } = useAssets({ limit: 5 });
  const { data: activeAssets } = useAssets({ status: AssetStatus.ACTIVE, limit: 1 });
  const { data: assignedAssets } = useAssets({ status: AssetStatus.ASSIGNED, limit: 1 });

  const total = allAssets?.total ?? 0;
  const active = activeAssets?.total ?? 0;
  const assigned = assignedAssets?.total ?? 0;
  const recent = allAssets?.data ?? [];

  const stats = [
    { label: 'Total Assets', value: total },
    { label: 'Active', value: active },
    { label: 'Assigned', value: assigned },
    { label: 'In Maintenance', value: total - active - assigned },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user ? `, ${user.firstName}` : ''}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Here&apos;s an overview of your assets</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent assets */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Recent Assets</h2>
          <Link href="/assets" className="text-xs text-gray-500 hover:text-gray-900 hover:underline">
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No assets yet.{' '}
            <Link href="/assets" className="text-gray-900 underline">Register your first asset</Link>
          </p>
        ) : (
          <div className="space-y-3">
            {recent.map((asset) => (
              <Link
                key={asset.id}
                href={`/assets/${asset.id}`}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {asset.assetId} · {asset.department?.name} · {format(new Date(asset.createdAt), 'MMM d')}
                  </p>
                </div>
                <StatusBadge status={asset.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
