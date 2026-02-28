// frontend/app/(dashboard)/reports/page.tsx
"use client";

import Link from "next/link";
import { format } from "date-fns";
import { BarChart3, Package } from "lucide-react";
import { clsx } from "clsx";
import { useReportsSummary } from "@/lib/query/hooks/useReports";
import { AssetStatus } from "@/lib/query/types/asset";
import { StatusBadge } from "@/components/assets/status-badge";

const STATUS_COLORS: Record<AssetStatus, string> = {
  [AssetStatus.ACTIVE]: "bg-green-500",
  [AssetStatus.ASSIGNED]: "bg-blue-500",
  [AssetStatus.MAINTENANCE]: "bg-yellow-500",
  [AssetStatus.RETIRED]: "bg-gray-400",
};

export default function ReportsPage() {
  const { data, isLoading } = useReportsSummary();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading report…
      </div>
    );
  }

  if (!data) return null;

  const { total, byStatus, byCategory, byDepartment, recent } = data;

  const statusItems = Object.entries(byStatus) as [AssetStatus, number][];
  const topCategories = [...byCategory]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const topDepartments = [...byDepartment]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Asset inventory overview</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 col-span-2 lg:col-span-1">
          <p className="text-sm text-gray-500">Total Assets</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{total}</p>
        </div>
        {statusItems.map(([status, count]) => (
          <div
            key={status}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <p className="text-sm text-gray-500 capitalize">
              {status.toLowerCase()}
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{count}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* By Status bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={15} className="text-gray-400" />
            Assets by Status
          </h2>
          <div className="space-y-3">
            {statusItems.map(([status, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span className="capitalize">{status.toLowerCase()}</span>
                    <span>
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all",
                        STATUS_COLORS[status],
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Category */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={15} className="text-gray-400" />
            Assets by Category
          </h2>
          {topCategories.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No data</p>
          ) : (
            <div className="space-y-3">
              {topCategories.map(({ name, count }) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={name}>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{name}</span>
                      <span>
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gray-900 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Department */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={15} className="text-gray-400" />
            Assets by Department
          </h2>
          {topDepartments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No data</p>
          ) : (
            <div className="space-y-3">
              {topDepartments.map(({ name, count }) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={name}>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{name}</span>
                      <span>
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Assets */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Package size={15} className="text-gray-400" />
              Recently Added
            </h2>
            <Link
              href="/assets"
              className="text-xs text-gray-400 hover:text-gray-900 hover:underline"
            >
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No assets yet
            </p>
          ) : (
            <div className="space-y-2">
              {recent.map((asset) => (
                <Link
                  key={asset.id}
                  href={`/assets/${asset.id}`}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {asset.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {asset.assetId} · {asset.category?.name ?? "—"} ·{" "}
                      {format(new Date(asset.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <StatusBadge status={asset.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
