'use client';

import { useState } from 'react';
import { useAuditLogs, AuditLogFilters } from '@/lib/query/hooks/useAuditLogs';
import { useAuthStore } from '@/store/auth.store';

export default function AuditLogPage() {
  const user = useAuthStore((s) => s.user);
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 20,
    entityType: 'ALL',
    action: 'ALL',
  });

  const { data, isLoading } = useAuditLogs({
    ...filters,
    entityType: filters.entityType === 'ALL' ? undefined : filters.entityType,
    action: filters.action === 'ALL' ? undefined : filters.action,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">Track changes across assets and users</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex gap-3 mb-4">
          <select
            value={filters.entityType || 'ALL'}
            onChange={(e) => setFilters((prev) => ({ ...prev, entityType: e.target.value, page: 1 }))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="ALL">All Entities</option>
            <option value="Asset">Asset</option>
            <option value="User">User</option>
          </select>
          <select
            value={filters.action || 'ALL'}
            onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value, page: 1 }))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="ALL">All Actions</option>
            <option value="CREATED">Created</option>
            <option value="UPDATED">Updated</option>
            <option value="DELETED">Deleted</option>
          </select>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading audit logs...</p>
        ) : !data?.data?.length ? (
          <p className="text-sm text-gray-500">No audit logs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                  <th className="text-left px-3 py-2">Time</th>
                  <th className="text-left px-3 py-2">Actor</th>
                  <th className="text-left px-3 py-2">Action</th>
                  <th className="text-left px-3 py-2">Entity</th>
                  <th className="text-left px-3 py-2">Summary</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-gray-600">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-3 py-2 text-gray-900">{log.actor.email}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{log.entityType}</td>
                    <td className="px-3 py-2 text-gray-900">{log.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
