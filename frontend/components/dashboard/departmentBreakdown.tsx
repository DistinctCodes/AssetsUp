'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchChartData, type DashboardRange } from '@/lib/api/dashboard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export default function DepartmentBreakdown({
  range,
  refreshIntervalMs,
}: {
  range: DashboardRange;
  refreshIntervalMs: number | false;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-charts', range],
    queryFn: ({ signal }) => fetchChartData(range, signal),
    refetchInterval: refreshIntervalMs,
  });

  if (isLoading) {
    return (
      <div className="h-full rounded-2xl border border-slate-800/80 bg-slate-900/80 animate-pulse" />
    );
  }

  return (
    <div className="h-full flex flex-col rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-4 md:px-6 md:py-6 shadow-[0_18px_60px_rgba(15,23,42,0.8)]">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-slate-50">
            Assets by department
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            See which teams hold the largest share of your asset base.
          </p>
        </div>
        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-200">
          Departments
        </span>
      </div>

      <div className="flex-1 min-h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.departmentData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#111827" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              stroke="#64748b"
            />
            <YAxis axisLine={false} tickLine={false} stroke="#64748b" />
            <Tooltip
              cursor={{ fill: 'rgba(15,23,42,0.6)' }}
              contentStyle={{
                borderRadius: '10px',
                border: '1px solid rgba(148, 163, 184, 0.4)',
                boxShadow: '0 18px 45px rgba(15,23,42,0.85)',
                background: '#020617',
                color: '#e2e8f0',
              }}
              labelStyle={{ color: '#e5e7eb' }}
              itemStyle={{ color: '#e5e7eb' }}
              wrapperStyle={{ zIndex: 9999 }}
            />
            <Bar dataKey="assets" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

