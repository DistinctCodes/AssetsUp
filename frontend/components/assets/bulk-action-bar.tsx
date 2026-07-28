'use client';

import { useState } from 'react';
import { useBulkUpdateStatus, useBulkDelete, BulkActionResponse } from '@/lib/query/hooks/useBulkAssets';
import { BulkAssignModal } from './bulk-assign-modal';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth.store';

interface BulkActionBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onShowToast: (message: string) => void;
}

function formatResult(action: string, res: BulkActionResponse) {
  const parts = [`${action} ${res.succeeded.length} assets`];
  if (res.skipped.length > 0) parts.push(`${res.skipped.length} skipped`);
  if (res.failed.length > 0) parts.push(`${res.failed.length} failed`);
  return parts.join(' · ');
}

export function BulkActionBar({ selectedIds, onClearSelection, onShowToast }: BulkActionBarProps) {
  const user = useAuthStore((s) => s.user);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const bulkStatus = useBulkUpdateStatus();
  const bulkDelete = useBulkDelete();

  if (selectedIds.length === 0) return null;

  const handleStatusChange = async (status: string) => {
    const res = await bulkStatus.mutateAsync({ ids: selectedIds, status });
    onShowToast(formatResult('Updated', res));
    onClearSelection();
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} assets? This action cannot be undone.`)) return;
    const res = await bulkDelete.mutateAsync({ ids: selectedIds });
    onShowToast(formatResult('Deleted', res));
    onClearSelection();
  };

  const handleAssignSuccess = () => {
    onShowToast('Assigned selected assets');
    onClearSelection();
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center space-x-6 border border-gray-700 animate-in slide-in-from-bottom-5">
        <span className="text-sm font-medium">{selectedIds.length} assets selected</span>
        <div className="h-4 w-px bg-gray-700" />
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="secondary">Update Status</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleStatusChange('AVAILABLE')}>AVAILABLE</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('ASSIGNED')}>ASSIGNED</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('IN_MAINTENANCE')}>IN_MAINTENANCE</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('RETIRED')}>RETIRED</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" variant="secondary" onClick={() => setIsAssignOpen(true)}>
            Assign
          </Button>

          {user?.role === 'ADMIN' && (
            <Button size="sm" variant="destructive" onClick={handleDelete} loading={bulkDelete.isPending}>
              Delete
            </Button>
          )}

          <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white" onClick={onClearSelection}>
            Cancel
          </Button>
        </div>
      </div>

      <BulkAssignModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        selectedIds={selectedIds}
        onSuccess={handleAssignSuccess}
      />
    </>
  );
}
