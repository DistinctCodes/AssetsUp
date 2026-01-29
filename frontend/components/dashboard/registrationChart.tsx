'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchChartData, type DashboardRange } from '@/lib/api/dashboard';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export default function RegistrationChart({
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
      <div className="h-80 rounded-2xl border border-slate-800/80 bg-slate-900/80 animate-pulse" />
    );
  }

  return (
    <div className="h-full flex flex-col rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-4 md:px-6 md:py-6 shadow-[0_18px_60px_rgba(15,23,42,0.8)]">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-slate-50">
            Asset registrations (6 months)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Smooth trend of new assets coming into your inventory.
          </p>
        </div>
        <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-medium text-sky-200">
          Live data
        </span>
      </div>
      <div className="flex-1 min-h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data?.registrationData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2933" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              stroke="#64748b"
            />
            <YAxis axisLine={false} tickLine={false} stroke="#64748b" />
            <Tooltip
              wrapperStyle={{ zIndex: 9999 }}
              contentStyle={{
                borderRadius: '10px',
                border: '1px solid rgba(148, 163, 184, 0.4)',
                boxShadow: '0 18px 45px rgba(15,23,42,0.85)',
                background: '#020617',
                color: '#e2e8f0',
              }}
              labelStyle={{ color: '#e5e7eb' }}
              itemStyle={{ color: '#e5e7eb' }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#38bdf8"
              strokeWidth={3}
              dot={{ r: 3.5, fill: '#0ea5e9', strokeWidth: 0 }}
              activeDot={{ r: 6, stroke: '#f97316', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

