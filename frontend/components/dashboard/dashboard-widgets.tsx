"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  Package,
  CheckCircle2,
  UserCheck,
  Wrench,
  AlertTriangle,
  Clock,
  PieChart as PieChartIcon,
  BarChart3,
  Layers,
  Calendar,
} from "lucide-react";
import { StatusBadge } from "@/components/assets/status-badge";
import { AssetStatus } from "@/lib/query/types/asset";

export type WidgetId =
  | "summary_stats"
  | "assets_by_status"
  | "assets_by_category"
  | "recent_assets"
  | "upcoming_maintenance"
  | "my_assigned_assets"
  | "low_stock_alerts"
  | "overdue_checkouts";

export interface WidgetConfig {
  id: WidgetId;
  title: string;
  description: string;
  defaultVisible: boolean;
}

export const ALL_WIDGETS: WidgetConfig[] = [
  {
    id: "summary_stats",
    title: "Summary Stats",
    description: "Total, active, assigned, and maintenance metrics",
    defaultVisible: true,
  },
  {
    id: "assets_by_status",
    title: "Assets by Status",
    description: "Visual breakdown chart of asset statuses",
    defaultVisible: true,
  },
  {
    id: "assets_by_category",
    title: "Assets by Category",
    description: "Distribution chart of assets across categories",
    defaultVisible: true,
  },
  {
    id: "recent_assets",
    title: "Recent Assets",
    description: "Table of recently registered assets",
    defaultVisible: true,
  },
  {
    id: "upcoming_maintenance",
    title: "Upcoming Maintenance",
    description: "Scheduled maintenance tasks and deadlines",
    defaultVisible: true,
  },
  {
    id: "my_assigned_assets",
    title: "My Assigned Assets",
    description: "Assets currently checked out to you",
    defaultVisible: true,
  },
  {
    id: "low_stock_alerts",
    title: "Low Stock Alerts",
    description: "Consumables and inventory items below threshold",
    defaultVisible: true,
  },
  {
    id: "overdue_checkouts",
    title: "Overdue Checkouts",
    description: "Assets past their expected return date",
    defaultVisible: true,
  },
];

export const DEFAULT_WIDGET_ORDER: WidgetId[] = ALL_WIDGETS.map((w) => w.id);

interface DashboardWidgetsProps {
  data?: {
    total?: number;
    byStatus?: Record<string, number>;
    recent?: Array<{
      id: string;
      name: string;
      assetId: string;
      status: AssetStatus;
      department?: { name: string } | null;
      createdAt: string;
    }>;
  };
  isLoading?: boolean;
  isError?: boolean;
}

const statCards = [
  { label: "Total Assets", key: "total", icon: Package, status: null },
  {
    label: "Active",
    key: "active",
    icon: CheckCircle2,
    status: AssetStatus.ACTIVE,
  },
  {
    label: "Assigned",
    key: "assigned",
    icon: UserCheck,
    status: AssetStatus.ASSIGNED,
  },
  {
    label: "In Maintenance",
    key: "maintenance",
    icon: Wrench,
    status: AssetStatus.MAINTENANCE,
  },
] as const;

export function SummaryStatsWidget({ data, isLoading }: DashboardWidgetsProps) {
  const counts = {
    total: data?.total ?? 0,
    active: data?.byStatus?.[AssetStatus.ACTIVE] ?? 0,
    assigned: data?.byStatus?.[AssetStatus.ASSIGNED] ?? 0,
    maintenance: data?.byStatus?.[AssetStatus.MAINTENANCE] ?? 0,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {isLoading
        ? statCards.map((s) => (
            <div
              key={s.key}
              className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse"
            >
              <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
              <div className="h-8 w-16 bg-gray-200 rounded" />
            </div>
          ))
        : statCards.map(({ label, key, icon: Icon, status }) => (
            <Link
              key={key}
              href={status ? `/assets?status=${status}` : "/assets"}
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
  );
}

export function AssetsByStatusWidget({ data }: DashboardWidgetsProps) {
  const statusData = [
    {
      label: "Active",
      count: data?.byStatus?.[AssetStatus.ACTIVE] ?? 12,
      color: "bg-emerald-500",
    },
    {
      label: "Assigned",
      count: data?.byStatus?.[AssetStatus.ASSIGNED] ?? 8,
      color: "bg-blue-500",
    },
    {
      label: "Maintenance",
      count: data?.byStatus?.[AssetStatus.MAINTENANCE] ?? 3,
      color: "bg-amber-500",
    },
    {
      label: "Retired",
      count: data?.byStatus?.[AssetStatus.RETIRED] ?? 1,
      color: "bg-slate-400",
    },
  ];

  const total = statusData.reduce((acc, curr) => acc + curr.count, 0) || 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PieChartIcon size={18} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">
            Assets by Status
          </h2>
        </div>
      </div>
      <div className="space-y-3">
        {statusData.map(({ label, count, color }) => {
          const pct = Math.round((count / total) * 100);
          return (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-gray-700">
                <span>{label}</span>
                <span>
                  {count} ({pct}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AssetsByCategoryWidget() {
  const categories = [
    { name: "Laptops & Computers", count: 14, icon: Package },
    { name: "Monitors & Displays", count: 9, icon: Layers },
    { name: "Office Furniture", count: 6, icon: Layers },
    { name: "Mobile Devices", count: 4, icon: Package },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">
            Assets by Category
          </h2>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {categories.map((cat) => (
          <div
            key={cat.name}
            className="py-2.5 flex items-center justify-between text-xs"
          >
            <span className="font-medium text-gray-700">{cat.name}</span>
            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold">
              {cat.count} items
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecentAssetsWidget({ data, isLoading }: DashboardWidgetsProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Recent Assets</h2>
        <Link
          href="/assets"
          className="text-xs text-gray-500 hover:text-gray-900 hover:underline"
        >
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
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : !data?.recent?.length ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-gray-400"
                >
                  No recent assets found.
                </td>
              </tr>
            ) : (
              data.recent.map((asset) => (
                <tr
                  key={asset.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => (window.location.href = `/assets/${asset.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {asset.name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{asset.assetId}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={asset.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {asset.department?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {format(new Date(asset.createdAt), "MMM d, yyyy")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function UpcomingMaintenanceWidget() {
  const items = [
    {
      title: "MacBook Pro M2 - Battery Check",
      date: "Tomorrow, 10:00 AM",
      status: "Scheduled",
    },
    {
      title: "Dell UltraSharp - Firmware Upgrade",
      date: "Jul 30, 2026",
      status: "Pending",
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-gray-900">
            Upcoming Maintenance
          </h2>
        </div>
      </div>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.title}
            className="p-3 bg-slate-50 rounded-lg flex items-center justify-between text-xs"
          >
            <div>
              <p className="font-medium text-gray-900">{item.title}</p>
              <p className="text-gray-500">{item.date}</p>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MyAssignedAssetsWidget() {
  const items = [
    {
      name: 'MacBook Pro 16" (M2 Max)',
      assetId: "AST-00102",
      date: "Assigned Jan 15, 2026",
    },
    {
      name: "Logitech MX Master 3S",
      assetId: "AST-00451",
      date: "Assigned Feb 01, 2026",
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <UserCheck size={18} className="text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-900">
            My Assigned Assets
          </h2>
        </div>
      </div>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.assetId}
            className="p-3 bg-slate-50 rounded-lg flex items-center justify-between text-xs"
          >
            <div>
              <p className="font-medium text-gray-900">{item.name}</p>
              <p className="text-gray-500 font-mono text-[11px]">
                {item.assetId}
              </p>
            </div>
            <span className="text-slate-500 text-[11px]">{item.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LowStockAlertsWidget() {
  const items = [
    { item: "USB-C Adapters", current: 2, threshold: 10 },
    { item: "HDMI Cables (2m)", current: 4, threshold: 15 },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-500" />
          <h2 className="text-sm font-semibold text-gray-900">
            Low Stock Alerts
          </h2>
        </div>
      </div>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.item}
            className="p-3 bg-red-50/60 rounded-lg flex items-center justify-between text-xs border border-red-100"
          >
            <div>
              <p className="font-medium text-red-900">{item.item}</p>
              <p className="text-red-700 text-[11px]">
                Threshold: {item.threshold} units
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold">
              {item.current} remaining
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OverdueCheckoutsWidget() {
  const items = [
    {
      name: "Sony WH-1000XM5 Headphones",
      borrower: "Alex Rivera",
      overdueDays: 4,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-rose-500" />
          <h2 className="text-sm font-semibold text-gray-900">
            Overdue Checkouts
          </h2>
        </div>
      </div>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.name}
            className="p-3 bg-rose-50/60 rounded-lg flex items-center justify-between text-xs border border-rose-100"
          >
            <div>
              <p className="font-medium text-rose-900">{item.name}</p>
              <p className="text-rose-700 text-[11px]">
                Checked out to {item.borrower}
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-900 font-bold">
              {item.overdueDays} days overdue
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WidgetRenderer({
  id,
  data,
  isLoading,
}: {
  id: WidgetId;
  data?: DashboardWidgetsProps["data"];
  isLoading?: boolean;
}) {
  switch (id) {
    case "summary_stats":
      return <SummaryStatsWidget data={data} isLoading={isLoading} />;
    case "assets_by_status":
      return <AssetsByStatusWidget data={data} />;
    case "assets_by_category":
      return <AssetsByCategoryWidget />;
    case "recent_assets":
      return <RecentAssetsWidget data={data} isLoading={isLoading} />;
    case "upcoming_maintenance":
      return <UpcomingMaintenanceWidget />;
    case "my_assigned_assets":
      return <MyAssignedAssetsWidget />;
    case "low_stock_alerts":
      return <LowStockAlertsWidget />;
    case "overdue_checkouts":
      return <OverdueCheckoutsWidget />;
    default:
      return null;
  }
}
