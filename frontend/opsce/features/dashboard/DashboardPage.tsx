'use client';

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Package, CheckCircle2, Wrench, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface ReportsSummary {
  total: number;
  active: number;
  maintenance: number;
  totalValue: number;
  byStatus: Record<string, number>;
  byDepartment: Array<{ name: string; count: number }>;
  recent: Array<{
    id: string;
    action: string;
    entityName: string;
    createdAt: string;
  }>;
}

function fetchReports(): Promise<ReportsSummary> {
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6003/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  return fetch(`${API}/reports`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
}

const STATUS_COLORS: Record<string, string> = {
  Active: '#10b981',
  Maintenance: '#f59e0b',
  Retired: '#ef4444',
  Inactive: '#6b7280',
};

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
      <div className="h-8 w-16 bg-gray-200 rounded" />
    </div>
  );
}

function ChartSkeleton() {
  return <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-64" />;
}

interface TrendProps {
  value: number;
}

function Trend({ value }: TrendProps) {
  const up = value >= 0;
  return (
    <span
      className={`flex items-center gap-0.5 text-xs ${up ? 'text-green-600' : 'text-red-500'}`}
    >
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {Math.abs(value)}% vs last month
    </span>
  );
}

export function DashboardPage() {
  const { data, isLoading } = useQuery<ReportsSummary>({
    queryKey: ['reports', 'summary'],
    queryFn: fetchReports,
  });

  const statCards = [
    { label: 'Total Assets', value: data?.total ?? 0, icon: Package, trend: 5 },
    { label: 'Active Assets', value: data?.active ?? 0, icon: CheckCircle2, trend: 2 },
    { label: 'In Maintenance', value: data?.maintenance ?? 0, icon: Wrench, trend: -1 },
    {
      label: 'Total Asset Value',
      value: `$${(data?.totalValue ?? 0).toLocaleString()}`,
      icon: DollarSign,
      trend: 8,
    },
  ];

  const pieData = Object.entries(data?.byStatus ?? {}).map(([name, value]) => ({
    name,
    value,
  }));

  const barData = (data?.byDepartment ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? statCards.map((_, i) => <CardSkeleton key={i} />)
          : statCards.map((card) => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <card.icon size={18} className="text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
                <Trend value={card.trend} />
              </div>
            ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assets by Status — Pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Assets by Status</h2>
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={STATUS_COLORS[entry.name] ?? '#6366f1'}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Assets by Department — Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Assets by Department (Top 5)
          </h2>
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3 animate-pulse">
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                </div>
              ))
            : (data?.recent ?? []).slice(0, 5).map((entry, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{entry.entityName}</p>
                    <p className="text-xs text-gray-400">{entry.action}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
          {!isLoading && !(data?.recent?.length) && (
            <p className="px-5 py-4 text-sm text-gray-400">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
