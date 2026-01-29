'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchChartData, type DashboardRange } from '@/lib/api/dashboard';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  Label,
} from 'recharts';

export default function CategoryChart({
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
    <div className="relative h-full flex flex-col rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-4 md:px-6 md:py-6 shadow-[0_18px_60px_rgba(15,23,42,0.8)]">
      <h3 className="text-base md:text-lg font-semibold text-slate-50 mb-1">
        Assets by category
      </h3>
      <p className="mb-4 text-xs text-slate-500">
        High-level distribution of your asset types.
      </p>
      <div className="relative flex-1 min-h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data?.categoryData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data?.categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <Label
                content={(props: any) => {
                  const cx = props?.viewBox?.cx;
                  const cy = props?.viewBox?.cy;
                  if (typeof cx !== 'number' || typeof cy !== 'number') return null;

                  return (
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                      <tspan x={cx} dy={-6} fill="#f8fafc" fontSize={22} fontWeight={600}>
                        1.2k
                      </tspan>
                      <tspan x={cx} dy={18} fill="#64748b" fontSize={12}>
                        Total assets
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
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
            <Legend
              verticalAlign="bottom"
              height={32}
              wrapperStyle={{ color: '#9ca3af', fontSize: 11 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

