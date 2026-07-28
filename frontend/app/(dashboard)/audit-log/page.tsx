'use client';

import { useState, Fragment } from 'react';
import Link from 'next/link';
import { useAuditLogs, AuditLogFilters, AuditLog } from '@/lib/query/hooks/useAuditLogs';
import { AuditLogDiff } from '@/components/audit-log/audit-log-diff';
import { useAuth } from '@/lib/auth/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, ChevronRight, Search, ShieldAlert } from 'lucide-react';

export default function AuditLogPage() {
  const { user } = useAuth();
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
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

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-gray-500 max-w-md">
          The Audit Log page is restricted to system administrators. Contact your administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getActionBadge = (action: AuditLog['action']) => {
    switch (action) {
      case 'CREATED':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">CREATED</Badge>;
      case 'UPDATED':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">UPDATED</Badge>;
      case 'DELETED':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">DELETED</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getEntityLink = (entityType: string, entityId: string) => {
    const route = entityType.toLowerCase();
    return (
      <Link href={`/${route}s/${entityId}`} className="text-blue-600 hover:underline font-mono text-xs">
        {entityId.substring(0, 8)}...
      </Link>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-sm text-gray-500">Track and inspect all system events, state changes, and administrative actions.</p>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-4 rounded-lg border">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <Input
            placeholder="Search entity ID or actor..."
            className="pl-9"
            value={filters.search || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
          />
        </div>

        <Select
          value={filters.entityType || 'ALL'}
          onValueChange={(val) => setFilters((prev) => ({ ...prev, entityType: val, page: 1 }))}
        >
          <SelectTrigger><SelectValue placeholder="Entity Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Entities</SelectItem>
            <SelectItem value="ASSET">Asset</SelectItem>
            <SelectItem value="USER">User</SelectItem>
            <SelectItem value="DEPARTMENT">Department</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.action || 'ALL'}
          onValueChange={(val) => setFilters((prev) => ({ ...prev, action: val, page: 1 }))}
        >
          <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Actions</SelectItem>
            <SelectItem value="CREATED">Created</SelectItem>
            <SelectItem value="UPDATED">Updated</SelectItem>
            <SelectItem value="DELETED">Deleted</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          placeholder="From Date"
          value={filters.from || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value, page: 1 }))}
        />

        <Input
          type="date"
          placeholder="To Date"
          value={filters.to || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value, page: 1 }))}
        />
      </div>

      {/* Audit Log Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">Loading audit logs...</TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-gray-500">No audit logs found matching criteria.</TableCell>
              </TableRow>
            ) : (
              data?.data.map((log) => {
                const isExpanded = !!expandedRows[log.id];
                return (
                  <Fragment key={log.id}>
                    <TableRow className="cursor-pointer hover:bg-gray-50" onClick={() => toggleRow(log.id)}>
                      <TableCell>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap text-gray-600">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={log.actor.avatarUrl} />
                            <AvatarFallback>{log.actor.firstName[0]}{log.actor.lastName[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{log.actor.firstName} {log.actor.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{log.entityType}</Badge></TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {getEntityLink(log.entityType, log.entityId)}
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-xs truncate">{log.summary}</TableCell>
                    </TableRow>

                    {/* Collapsible Diff Row */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-gray-50/50 p-4 border-t border-b">
                          <AuditLogDiff oldValues={log.oldValues} newValues={log.newValues} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t">
            <p className="text-xs text-gray-500">
              Showing Page {data.page} of {data.totalPages} ({data.total} total logs)
            </p>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page === 1}
                onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page === data.totalPages}
                onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}