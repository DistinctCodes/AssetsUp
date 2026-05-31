'use client';

import { useState } from 'react';
import { X, Check } from 'lucide-react';

type BulkAction = 'status' | 'department' | 'location' | 'delete';

const ACTION_OPTIONS: { value: BulkAction; label: string }[] = [
  { value: 'status', label: 'Change Status' },
  { value: 'department', label: 'Reassign Department' },
  { value: 'location', label: 'Change Location' },
  { value: 'delete', label: 'Delete' },
];

interface BulkResult {
  id: string;
  success: boolean;
  error?: string;
}

interface Props {
  selectedIds: string[];
  onClearSelection: () => void;
  onActionComplete?: () => void;
}

export function BulkActionBar({ selectedIds, onClearSelection, onActionComplete }: Props) {
  const [activeAction, setActiveAction] = useState<BulkAction | null>(null);
  const [actionValue, setActionValue] = useState('');
  const [results, setResults] = useState<BulkResult[]>([]);
  const [loading, setLoading] = useState(false);

  if (!selectedIds.length) return null;

  const handleApply = async () => {
    if (!activeAction) return;
    setLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6003/api';
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
      const res = await fetch(`${API}/assets/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ids: selectedIds,
          action: activeAction,
          value: actionValue,
        }),
      });
      const data = await res.json();
      setResults(
        data.results ?? selectedIds.map((id) => ({ id, success: res.ok })),
      );
      if (res.ok) onActionComplete?.();
    } catch {
      setResults(
        selectedIds.map((id) => ({ id, success: false, error: 'Request failed' })),
      );
    }
    setLoading(false);
  };

  return (
    <>
      {/* Sticky action bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4 min-w-[420px]">
        <span className="text-sm font-medium">
          {selectedIds.length} asset{selectedIds.length !== 1 ? 's' : ''} selected
        </span>

        <div className="flex items-center gap-2 flex-1">
          <select
            className="bg-gray-800 text-sm text-white rounded-lg px-2 py-1.5 border border-gray-700 flex-1"
            value={activeAction ?? ''}
            onChange={(e) => {
              setActiveAction((e.target.value as BulkAction) || null);
              setActionValue('');
              setResults([]);
            }}
          >
            <option value="">Choose action…</option>
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {activeAction && activeAction !== 'delete' && (
            <input
              className="bg-gray-800 text-sm text-white rounded-lg px-2 py-1.5 border border-gray-700 w-32"
              placeholder="New value…"
              value={actionValue}
              onChange={(e) => setActionValue(e.target.value)}
            />
          )}

          <button
            disabled={
              !activeAction || loading || (activeAction !== 'delete' && !actionValue)
            }
            onClick={handleApply}
            className="px-3 py-1.5 text-sm bg-white text-gray-900 rounded-lg font-medium disabled:opacity-40 hover:bg-gray-100 transition-colors"
          >
            {loading ? 'Applying…' : 'Apply'}
          </button>
        </div>

        <button
          onClick={() => {
            onClearSelection();
            setResults([]);
            setActiveAction(null);
          }}
          className="text-gray-400 hover:text-white"
          aria-label="Clear selection"
        >
          <X size={18} />
        </button>
      </div>

      {/* Results modal */}
      {results.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setResults([])}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 max-h-96 overflow-y-auto">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Bulk Action Results
            </h3>
            <div className="space-y-2">
              {results.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center gap-2 text-sm ${
                    r.success ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {r.success ? <Check size={14} /> : <X size={14} />}
                  <span>
                    {r.id}: {r.success ? 'Success' : (r.error ?? 'Failed')}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setResults([])}
              className="mt-4 w-full px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
