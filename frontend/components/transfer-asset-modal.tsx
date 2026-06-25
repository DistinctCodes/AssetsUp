'use client';

import { useState, useMemo } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTransferAsset, useUsers, useDepartments } from '@/lib/query/hooks/useAsset';
import type { Asset } from '@/lib/query/types/asset';

interface Props {
  asset: Asset;
  onClose: () => void;
}

export function TransferAssetModal({ asset, onClose }: Props) {
  const [toUserId, setToUserId] = useState<string>('');
  const [toDepartmentId, setToDepartmentId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: departments = [], isLoading: departmentsLoading } = useDepartments();

  const { mutate: transfer, isPending } = useTransferAsset(asset.id, {
    onSuccess: () => {
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Transfer failed. Please try again.');
    },
  });

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q),
    );
  }, [users, userSearch]);

  const isValid = toUserId || toDepartmentId;

  const handleSubmit = () => {
    if (!isValid) return;
    setError(null);
    transfer({
      toUserId: toUserId || undefined,
      toDepartmentId: toDepartmentId || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const currentAssignee = asset.assignedTo?.name ?? 'Unassigned';
  const currentDepartment = asset.department?.name ?? '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <h3 className="text-base font-semibold text-gray-900 mb-1">Transfer Asset</h3>
        <p className="text-xs text-gray-500 mb-5">
          <span className="font-medium text-gray-700">{asset.name}</span>
        </p>

        {/* Current "from" context */}
        <div className="bg-gray-50 rounded-lg px-4 py-3 mb-5 flex items-center gap-3 text-sm">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">Current assignee</p>
            <p className="font-medium text-gray-800 truncate">{currentAssignee}</p>
          </div>
          <ArrowRight size={16} className="text-gray-300 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">Current department</p>
            <p className="font-medium text-gray-800 truncate">{currentDepartment}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* User selector with search */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Transfer to user <span className="text-gray-400">(optional)</span>
            </label>
            <div className="relative mb-1.5">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-gray-900"
                placeholder="Search by name or email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              size={Math.min(filteredUsers.length + 1, 5)}
            >
              <option value="">— No user —</option>
              {usersLoading ? (
                <option disabled>Loading…</option>
              ) : (
                filteredUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}{u.email ? ` (${u.email})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Department selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Transfer to department <span className="text-gray-400">(optional)</span>
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-900"
              value={toDepartmentId}
              onChange={(e) => setToDepartmentId(e.target.value)}
            >
              <option value="">— No department —</option>
              {departmentsLoading ? (
                <option disabled>Loading…</option>
              ) : (
                departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Notes <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-gray-900"
              rows={2}
              placeholder="Reason for transfer…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Validation hint */}
          {!isValid && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Select at least a user or a department to transfer this asset.
            </p>
          )}

          {/* API error */}
          {error && (
            <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={!isValid}
            loading={isPending}
            onClick={handleSubmit}
          >
            Transfer
          </Button>
        </div>
      </div>
    </div>
  );
}