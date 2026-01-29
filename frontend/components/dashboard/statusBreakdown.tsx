'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats, type DashboardRange } from '@/lib/api/dashboard';
import { ShieldCheck, UserCheck, Wrench, Archive } from 'lucide-react';

export default function StatusBreakdown({
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
      <div className="h-full rounded-2xl border border-slate-800/80 bg-slate-900/80 animate-pulse" />
    );
  }

  const s = data?.statusBreakdown;
  if (!s) return null;

  const total = Math.max(1, s.active + s.assigned + s.maintenance + s.retired);
  const items = [
    {
      label: 'Active',
      value: s.active,
      pct: Math.round((s.active / total) * 100),
      icon: ShieldCheck,
      classes: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
      bar: 'bg-emerald-400',
    },
    {
      label: 'Assigned',
      value: s.assigned,
      pct: Math.round((s.assigned / total) * 100),
      icon: UserCheck,
      classes: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
      bar: 'bg-sky-400',
    },
    {
      label: 'Maintenance',
      value: s.maintenance,
      pct: Math.round((s.maintenance / total) * 100),
      icon: Wrench,
      classes: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
      bar: 'bg-amber-400',
    },
    {
      label: 'Retired',
      value: s.retired,
      pct: Math.round((s.retired / total) * 100),
      icon: Archive,
      classes: 'border-slate-600/40 bg-slate-800/40 text-slate-200',
      bar: 'bg-slate-400',
    },
  ];

  return (
    <div className="h-full flex flex-col rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-4 md:px-6 md:py-6 shadow-[0_18px_60px_rgba(15,23,42,0.8)]">
      <div className="mb-4">
        <h3 className="text-base md:text-lg font-semibold text-slate-50">
          Assets by status
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Breakdown of assets across lifecycle states.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.label} className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${it.classes}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-100">{it.label}</span>
                  <span className="text-xs text-slate-400">
                    {it.value.toLocaleString()} • {it.pct}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-900">
                  <div
                    className={`h-1.5 rounded-full ${it.bar}`}
                    style={{ width: `${it.pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

