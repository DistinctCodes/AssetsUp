'use client';

import { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const FIELDS = [
  'Name',
  'Serial Number',
  'Category',
  'Status',
  'Condition',
  'Department',
  'Location',
  'Assigned To',
  'Purchase Date',
  'Value',
] as const;

const OPERATORS = [
  'contains',
  'equals',
  'greater than',
  'less than',
  'is empty',
] as const;

type Field = (typeof FIELDS)[number];
type Operator = (typeof OPERATORS)[number];

interface FilterRow {
  id: string;
  field: Field;
  operator: Operator;
  value: string;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

interface Props {
  onSearch?: (params: URLSearchParams) => void;
}

export function AdvancedSearchBar({ onSearch }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [advanced, setAdvanced] = useState(false);
  const [simpleQuery, setSimpleQuery] = useState(searchParams.get('search') ?? '');
  const [filters, setFilters] = useState<FilterRow[]>([
    { id: uid(), field: 'Name', operator: 'contains', value: '' },
  ]);

  const addFilter = () =>
    setFilters((f) => [...f, { id: uid(), field: 'Name', operator: 'contains', value: '' }]);

  const removeFilter = (id: string) => setFilters((f) => f.filter((r) => r.id !== id));

  const updateFilter = (id: string, patch: Partial<FilterRow>) =>
    setFilters((f) => f.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const applyAdvanced = useCallback(() => {
    const params = new URLSearchParams();
    filters.forEach((f, i) => {
      if (f.operator !== 'is empty' && !f.value) return;
      params.set(`filter[${i}][field]`, f.field);
      params.set(`filter[${i}][op]`, f.operator);
      if (f.operator !== 'is empty') params.set(`filter[${i}][value]`, f.value);
    });
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ''}`);
    onSearch?.(params);
  }, [filters, pathname, router, onSearch]);

  const applySimple = useCallback(() => {
    const params = new URLSearchParams();
    if (simpleQuery) params.set('search', simpleQuery);
    router.push(`${pathname}${params.toString() ? `?${params}` : ''}`);
    onSearch?.(params);
  }, [simpleQuery, pathname, router, onSearch]);

  if (!advanced) {
    return (
      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="Search assets..."
          value={simpleQuery}
          onChange={(e) => setSimpleQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySimple()}
        />
        <button
          onClick={applySimple}
          className="px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700"
        >
          Search
        </button>
        <button
          onClick={() => setAdvanced(true)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
        >
          Advanced
        </button>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">Advanced Search</span>
        <button
          onClick={() => setAdvanced(false)}
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          Simple
        </button>
      </div>

      {filters.map((row) => (
        <div key={row.id} className="flex gap-2 items-center">
          <select
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg flex-shrink-0"
            value={row.field}
            onChange={(e) => updateFilter(row.id, { field: e.target.value as Field })}
          >
            {FIELDS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>

          <select
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg flex-shrink-0"
            value={row.operator}
            onChange={(e) => updateFilter(row.id, { operator: e.target.value as Operator })}
          >
            {OPERATORS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>

          {row.operator !== 'is empty' && (
            <input
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
              value={row.value}
              onChange={(e) => updateFilter(row.id, { value: e.target.value })}
              placeholder="Value..."
            />
          )}

          <button
            onClick={() => removeFilter(row.id)}
            className="text-gray-400 hover:text-red-500 flex-shrink-0"
            aria-label="Remove filter"
          >
            <X size={16} />
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <button
          onClick={addFilter}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
        >
          <Plus size={14} /> Add filter
        </button>
        <div className="flex-1" />
        <button
          onClick={applyAdvanced}
          className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
