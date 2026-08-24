'use client';

import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ReportsSummary } from '@/lib/api/reports';
import { AssetStatus } from '@/lib/query/types/asset';

// ─── Color palettes ───────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  [AssetStatus.ACTIVE]:      '#22c55e',
  [AssetStatus.ASSIGNED]:    '#3b82f6',
  [AssetStatus.MAINTENANCE]: '#f59e0b',
  [AssetStatus.RETIRED]:     '#9ca3af',
};

const CATEGORY_COLORS = [
  '#6366f1', '#ec4899', '#14b8a6', '#f97316',
  '#8b5cf6', '#06b6d4', '#84cc16', '#ef4444',
];

// ─── Accessible toggle ────────────────────────────────────────────────────────
function ChartToggle({
  showTable,
  onToggle,
  chartId,
}: {
  showTable: boolean;
  onToggle: () => void;
  chartId: string;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={showTable}
      aria-controls={chartId}
      className="text-xs text-gray-400 hover:text-gray-700 underline ml-auto"
    >
      {showTable ? 'Show chart' : 'Show data table'}
    </button>
  );
}

// ─── Status Distribution Donut ────────────────────────────────────────────────
function StatusDonut({ byStatus }: { byStatus: Record<string, number> }) {
  const [showTable, setShowTable] = useState(false);

  const data = Object.entries(byStatus).map(([name, value]) => ({ name, value }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Status Distribution</h3>
        <ChartToggle
          showTable={showTable}
          onToggle={() => setShowTable((v) => !v)}
          chartId="status-donut-table"
        />
      </div>

      {showTable ? (
        <table
          id="status-donut-table"
          className="w-full text-sm"
          aria-label="Assets by status"
        >
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
              <th className="text-left py-2 font-medium">Status</th>
              <th className="text-right py-2 font-medium">Count</th>
            </tr>
          </thead>
          <tbody>
            {data.map(({ name, value }) => (
              <tr key={name} className="border-b border-gray-50 last:border-0">
                <td className="py-2 text-gray-700 capitalize">{name.toLowerCase()}</td>
                <td className="py-2 text-right text-gray-900 font-medium">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              aria-label="Donut chart: assets by status"
            >
              {data.map(({ name }) => (
                <Cell
                  key={name}
                  fill={STATUS_COLORS[name] ?? '#9ca3af'}
                />
              ))}
            </Pie>
            <Legend
              formatter={(value) => (
                <span className="text-xs text-gray-600 capitalize">
                  {value.toLowerCase()}
                </span>
              )}
            />
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined) => [value ?? 0, (name ?? '').toLowerCase()]}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Category Bar Chart ───────────────────────────────────────────────────────
function CategoryBar({
  byCategory,
}: {
  byCategory: { name: string; count: number }[];
}) {
  const [showTable, setShowTable] = useState(false);

  const data = [...byCategory]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((item, i) => ({ ...item, fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Assets by Category</h3>
        <ChartToggle
          showTable={showTable}
          onToggle={() => setShowTable((v) => !v)}
          chartId="category-bar-table"
        />
      </div>

      {showTable ? (
        <table
          id="category-bar-table"
          className="w-full text-sm"
          aria-label="Assets by category"
        >
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
              <th className="text-left py-2 font-medium">Category</th>
              <th className="text-right py-2 font-medium">Count</th>
            </tr>
          </thead>
          <tbody>
            {data.map(({ name, count }) => (
              <tr key={name} className="border-b border-gray-50 last:border-0">
                <td className="py-2 text-gray-700">{name}</td>
                <td className="py-2 text-right text-gray-900 font-medium">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No category data</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            aria-label="Bar chart: assets by category"
          >
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: '#f3f4f6' }}
              formatter={(value: number | undefined) => [value ?? 0, 'Assets']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map(({ name, fill }) => (
                <Cell key={name} fill={fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Department Bar Chart ─────────────────────────────────────────────────────
function DepartmentBar({
  byDepartment,
}: {
  byDepartment: { name: string; count: number }[];
}) {
  const [showTable, setShowTable] = useState(false);

  const data = [...byDepartment]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Assets by Department</h3>
        <ChartToggle
          showTable={showTable}
          onToggle={() => setShowTable((v) => !v)}
          chartId="dept-bar-table"
        />
      </div>

      {showTable ? (
        <table
          id="dept-bar-table"
          className="w-full text-sm"
          aria-label="Assets by department"
        >
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
              <th className="text-left py-2 font-medium">Department</th>
              <th className="text-right py-2 font-medium">Count</th>
            </tr>
          </thead>
          <tbody>
            {data.map(({ name, count }) => (
              <tr key={name} className="border-b border-gray-50 last:border-0">
                <td className="py-2 text-gray-700">{name}</td>
                <td className="py-2 text-right text-gray-900 font-medium">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No department data</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
            aria-label="Horizontal bar chart: assets by department"
          >
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              width={90}
            />
            <Tooltip
              cursor={{ fill: '#f3f4f6' }}
              formatter={(value: number | undefined) => [value ?? 0, 'Assets']}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
interface Props {
  data: ReportsSummary;
}

export default function DashboardCharts({ data }: Props) {
  const { byStatus, byCategory, byDepartment } = data;
  return (
    <section aria-label="Asset charts" className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <StatusDonut byStatus={byStatus} />
        <CategoryBar byCategory={byCategory} />
        <DepartmentBar byDepartment={byDepartment} />
      </div>
    </section>
  );
}
