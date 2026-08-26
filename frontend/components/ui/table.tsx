import { TableHTMLAttributes, forwardRef, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square } from 'lucide-react';

// Core table components
export const Table = forwardRef<HTMLTableElement, TableHTMLAttributes<HTMLTableElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table ref={ref} className={`w-full text-sm ${className || ''}`} {...props}>
          {children}
        </table>
      </div>
    </div>
  ),
);
Table.displayName = 'Table';

export const TableHeader = ({ children }: { children?: React.ReactNode }) => <thead>{children}</thead>;
export const TableBody = ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>;
export const TableRow = forwardRef<HTMLTableRowElement, { children?: React.ReactNode; selected?: boolean; onClick?: () => void; className?: string }>(
  ({ children, selected, onClick, className = '' }, ref) => (
    <tr
      ref={ref}
      onClick={onClick}
      className={`border-b border-gray-100 transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  )
);
TableRow.displayName = 'TableRow';

// Sortable table head with sorting indicators
interface SortableTableHeadProps {
  children: React.ReactNode;
  sortKey: string;
  currentSort: { key: string; direction: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;
  className?: string;
}

export const TableHead = forwardRef<HTMLTableHeaderCellElement, SortableTableHeadProps | { children?: React.ReactNode; className?: string }>(
  (props, ref) => {
    // Check if this is a sortable table head
    if ('sortKey' in props && 'onSort' in props) {
      const { sortKey, currentSort, onSort, children, className = '' } = props;
      const isActive = currentSort?.key === sortKey;
      return (
        <th
          ref={ref}
          onClick={() => onSort(sortKey)}
          className={`text-left px-4 py-3 font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none ${className}`}
        >
          <div className="flex items-center gap-1">
            {children}
            {isActive ? (
              currentSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
            ) : (
              <ArrowUpDown size={14} className="text-gray-400" />
            )}
          </div>
        </th>
      );
    }
    // Regular table head for non-sortable columns (like checkbox column)
    const { children, className = '' } = props as { children?: React.ReactNode; className?: string };
    return <th ref={ref} className={`text-left px-2 py-1 ${className}`}>{children}</th>;
  }
);
TableHead.displayName = 'TableHead';

export const TableCell = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => (
  <td className={`px-4 py-3 ${className}`}>{children}</td>
);

// Empty state component
export const TableEmptyState = ({ colSpan, message }: { colSpan: number; message?: string }) => (
  <tr>
    <td colSpan={colSpan} className="text-center py-12 text-gray-400">
      {message || 'No data available.'}
    </td>
  </tr>
);

// Row selection hook and components
interface UseRowSelectionProps<T extends { id: string }> {
  rows: T[];
  onSelectionChange?: (selectedIds: string[]) => void;
}

export function useRowSelection<T extends { id: string }>({ rows, onSelectionChange }: UseRowSelectionProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onSelectionChange?.(Array.from(next));
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(prev => {
      const allSelected = rows.every(row => prev.has(row.id));
      const next = allSelected ? new Set<string>() : new Set(rows.map(row => row.id));
      onSelectionChange?.(Array.from(next));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    onSelectionChange?.([]);
  };

  const isSelected = (id: string) => selectedIds.has(id);
  const allSelected = rows.length > 0 && rows.every(row => selectedIds.has(row.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  return {
    selectedIds: Array.from(selectedIds),
    toggleRow,
    toggleAll,
    clearSelection,
    isSelected,
    allSelected,
    someSelected,
  };
}

// Selection checkbox component for table headers
export function TableSelectionHeader({ allSelected, someSelected, onToggleAll }: { allSelected: boolean; someSelected: boolean; onToggleAll: () => void }) {
  return (
    <th className="w-10 px-4 py-3">
      <button onClick={onToggleAll} className="p-1 hover:bg-gray-100 rounded">
        {allSelected || someSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} className="text-gray-400" />}
      </button>
    </th>
  );
}

// Selection checkbox component for table rows
export function TableSelectionCell({ isSelected, onToggle }: { isSelected: boolean; onToggle: () => void }) {
  return (
    <td className="w-10 px-4 py-3">
      <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="p-1 hover:bg-gray-100 rounded">
        {isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} className="text-gray-400" />}
      </button>
    </td>
  );
}