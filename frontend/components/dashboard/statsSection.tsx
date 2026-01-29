'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats, type DashboardRange } from '@/lib/api/dashboard';
import {
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  Gauge,
  Coins,
  BellRing,
} from 'lucide-react';

const icons = {
  asset: Boxes,
  status: Gauge,
  value: Coins,
  alert: BellRing,
};

export default function StatsSection({
  range,
  refreshIntervalMs,
}: {
  range: DashboardRange;
  refreshIntervalMs: number | false;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats', range],
    queryFn: ({ signal }) => fetchDashboardStats(range, signal),
    refetchInterval: refreshIntervalMs,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 rounded-2xl border border-slate-800/70 bg-slate-900/80 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
      {data?.cards?.map((stat, idx) => {
        const Icon = icons[stat.icon];
        const isPositive = stat.trendDirection === 'up';
        const attention =
          stat.icon === 'alert'
            ? data.attentionBreakdown
            : null;
        
        return (
          <div
            key={idx}
            className="group relative overflow-hidden rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950/90 px-4 py-4 shadow-[0_18px_60px_rgba(15,23,42,0.75)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            <div className="pointer-events-none absolute inset-0 opacity-40 blur-2xl">
              <div
                className={`absolute -top-8 -right-6 h-20 w-20 rounded-full ${
                  stat.icon === 'alert'
                    ? 'bg-rose-500/25'
                    : stat.icon === 'value'
                    ? 'bg-amber-400/25'
                    : stat.icon === 'status'
                    ? 'bg-emerald-400/25'
                    : 'bg-sky-500/25'
                }`}
              />
            </div>

            <div className="relative flex items-start justify-between mb-4 gap-2">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm shadow-sm ${
                  stat.icon === 'alert'
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                    : stat.icon === 'value'
                    ? 'border-amber-400/40 bg-amber-400/10 text-amber-200'
                    : stat.icon === 'status'
                    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                    : 'border-sky-400/40 bg-sky-400/10 text-sky-200'
                }`}
              >
                <Icon size={18} />
              </div>

              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${
                  isPositive
                    ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30'
                }`}
              >
                {stat.trend}%
                {isPositive ? (
                  <ArrowUpRight size={14} className="ml-0.5" />
                ) : (
                  <ArrowDownRight size={14} className="ml-0.5" />
                )}
              </span>
            </div>

            <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              {stat.label}
            </h3>
            <p className="mt-1 text-2xl font-semibold text-slate-50">
              {stat.value}
            </p>

            <p className="mt-1 text-[11px] text-slate-500">
              {attention
                ? `${attention.warrantyExpiring} warranty expiring • ${attention.maintenanceDue} maintenance due`
                : isPositive
                ? 'Improved vs last period'
                : 'Lower vs last period'}
            </p>
          </div>
        );
      })}
    </div>
  );
}