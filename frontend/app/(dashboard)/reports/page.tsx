
"use client";

import Link from "next/link";
import { format } from "date-fns";
import { BarChart3, Package } from "lucide-react";
import { clsx } from "clsx";

import { StatusBadge } from "@/components/assets/status-badge";
import { DateRangeSelector } from "@/features/Dashboard/DateRangeSelector";
import { useReportsSummary } from "@/lib/query/hooks/useReports";
import { AssetStatus } from "@/lib/query/types/asset";

const STATUS_COLORS: Partial<Record<AssetStatus, string>> = {
  [AssetStatus.AVAILABLE]: "bg-green-500",
  [AssetStatus.ASSIGNED]: "bg-blue-500",
  [AssetStatus.IN_MAINTENANCE]: "bg-yellow-500",
  [AssetStatus.IN_TRANSIT]: "bg-indigo-500",
  [AssetStatus.RETIRED]: "bg-gray-400",
  [AssetStatus.DISPOSED]: "bg-slate-500",
  [AssetStatus.LOST]: "bg-red-500",
};

const MAX_DISPLAY_ITEMS = 8;

type ProgressBarProps = {
  label: string;
  count: number;
  total: number;
  color?: string;
};

function getPercentage(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function ProgressBar({
  label,
  count,
  total,
  color = "bg-gray-900",
}: ProgressBarProps) {
  const percentage = getPercentage(count, total);

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span className="truncate flex-1">{label}</span>
        <span className="ml-2">
          {count} ({percentage}%)
        </span>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-all", color)}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${percentage}%`}
        />
      </div>
    </div>
  );
}

function SectionHeading({
  children,
  icon: Icon = BarChart3,
}: {
  children: React.ReactNode;
  icon?: typeof BarChart3;
}) {
  return (
    <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <Icon size={15} className="text-gray-400" aria-hidden="true" />
      {children}
    </h2>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-gray-400 text-center py-6">{children}</p>
  );
}

function DistributionSection({
  title,
  items,
  total,
  color,
}: {
  title: string;
  items: { name: string; count: number }[];
  total: number;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <SectionHeading>{title}</SectionHeading>

      {items.length === 0 ? (
        <EmptyState>No data yet</EmptyState>
      ) : (
        <div className="space-y-3">
          {items.map(({ name, count }) => (
            <ProgressBar
              key={name}
              label={name}
              count={count}
              total={total}
              color={color}
            />
          ))}
        </div>
      )}
    </div>
  );
}

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
    .slice(0, MAX_DISPLAY_ITEMS);

  const topDepartments = [...byDepartment]
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_DISPLAY_ITEMS);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Asset inventory overview
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <DateRangeSelector
          onChange={(range) => {
            // In a real implementation, the API call would filter by these dates.
            console.log("Date range changed:", range);
          }}
        />
      </div>

      {/* Summary Cards */}
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
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {count}
            </p>
          </div>
        ))}
      </div>

      {/* Status and Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* By Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <SectionHeading>Assets by Status</SectionHeading>

          {total === 0 ? (
            <EmptyState>No data yet</EmptyState>
          ) : (
            <div className="space-y-3">
              {statusItems.map(([status, count]) => (
                <ProgressBar
                  key={status}
                  label={status.toLowerCase()}
                  count={count}
                  total={total}
                  color={STATUS_COLORS[status] ?? "bg-gray-500"}
                />
              ))}
            </div>
          )}
        </div>

        {/* By Category */}
        <DistributionSection
          title="Assets by Category"
          items={topCategories}
          total={total}
        />
      </div>

      {/* Department and Recent Assets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Department */}
        <DistributionSection
          title="Assets by Department"
          items={topDepartments}
          total={total}
          color="bg-blue-500"
        />

        {/* Recent Assets */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionHeading icon={Package}>
              Recently Added
            </SectionHeading>

            <Link
              href="/assets"
              className="text-xs text-gray-400 hover:text-gray-900 hover:underline"
            >
              View all
            </Link>
          </div>

          {recent.length === 0 ? (
            <EmptyState>No assets yet</EmptyState>
          ) : (
            <div className="space-y-2">
              {recent.map((asset) => (
                <Link
                  key={asset.id}
                  href={`/assets/${asset.id}`}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {asset.name}
                    </p>

                    <p className="text-xs text-gray-400 mt-0.5 truncate">
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
