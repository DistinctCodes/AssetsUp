'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FileArrowDown, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ToastProvider, toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { useReportsSummary } from '@/lib/query/hooks';

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { data: summary, isLoading } = useReportsSummary();
  const [exporting, setExporting] = useState({ excel: false, pdf: false });

  const statusData = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.byStatus).map(([status, count]) => ({ status, count }));
  }, [summary]);

  const topCategories = useMemo(() => {
    if (!summary) return [];
    return [...summary.byCategory].sort((a, b) => b.count - a.count).slice(0, 5);
  }, [summary]);

  const topDepartments = useMemo(() => {
    if (!summary) return [];
    return [...summary.byDepartment].sort((a, b) => b.count - a.count).slice(0, 5);
  }, [summary]);

  const handleExport = async (type: 'excel' | 'pdf') => {
    setExporting((prev) => ({ ...prev, [type]: true }));

    try {
      const response = await api.get(`/reports/export/${type}`, { responseType: 'blob' });
      const contentType = type === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf';
      const filename = `asset-report.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      const blob = new Blob([response.data], { type: contentType });
      downloadBlob(filename, blob);
      toast.success(`${type === 'excel' ? 'Excel' : 'PDF'} export started`);
    } catch (error) {
      toast.error(`Failed to export ${type.toUpperCase()}`);
    } finally {
      setExporting((prev) => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div>
      <ToastProvider />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Review asset health and department performance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            loading={exporting.excel}
            onClick={() => handleExport('excel')}
          >
            <FileArrowDown size={16} />
            Export Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="md"
            loading={exporting.pdf}
            onClick={() => handleExport('pdf')}
          >
            <FileArrowDown size={16} />
            Export PDF
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={5} columns={1} />
      ) : !summary ? (
        <EmptyState
          title="No reports available"
          description="No data is available for the selected period. Check back after assets are added."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-6">
              <p className="text-sm font-semibold text-gray-500">Total Assets</p>
              <p className="mt-3 text-3xl font-semibold text-gray-900">{summary.total}</p>
            </div>
            {Object.entries(summary.byStatus).map(([status, count]) => (
              <div key={status} className="rounded-3xl border border-gray-200 bg-white p-6">
                <p className="text-sm font-semibold text-gray-500">{status}</p>
                <p className="mt-3 text-3xl font-semibold text-gray-900">{count}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
            <div className="rounded-3xl border border-gray-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-4 text-gray-900">
                <BarChart3 size={18} />
                <h2 className="text-lg font-semibold">Assets by status</h2>
              </div>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="status" axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#111827" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-white p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Top 5 categories</h3>
                {topCategories.length === 0 ? (
                  <p className="text-sm text-gray-500">No category data available.</p>
                ) : (
                  <div className="space-y-3">
                    {topCategories.map((category) => (
                      <div key={category.name} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                        <span className="text-sm text-gray-900">{category.name}</span>
                        <span className="text-sm font-semibold text-gray-900">{category.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-3xl border border-gray-200 bg-white p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Top 5 departments</h3>
                {topDepartments.length === 0 ? (
                  <p className="text-sm text-gray-500">No department data available.</p>
                ) : (
                  <div className="space-y-3">
                    {topDepartments.map((department) => (
                      <div key={department.name} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                        <span className="text-sm text-gray-900">{department.name}</span>
                        <span className="text-sm font-semibold text-gray-900">{department.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
