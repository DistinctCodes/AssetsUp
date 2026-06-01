"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  isLoading?: boolean;
  /** Called whenever the set of selected rows changes. Receives an array of selected row objects. */
  onSelectionChange?: (selectedRows: TData[]) => void;
  /** Slot rendered when data is an empty array and isLoading is false. */
  emptyState?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function TableSkeleton({ columnCount }: { columnCount: number }) {
  return (
    <>
      {Array.from({ length: 3 }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-b border-gray-100">
          {/* checkbox column */}
          <td className="px-4 py-3">
            <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
          </td>
          {Array.from({ length: columnCount }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
              <div
                className="h-4 rounded bg-gray-200 animate-pulse"
                style={{ width: `${55 + Math.random() * 35}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Sort icon
// ---------------------------------------------------------------------------
function SortIcon({ direction }: { direction: "asc" | "desc" | false }) {
  return (
    <span aria-hidden="true" className="ml-1.5 inline-flex flex-col gap-px">
      <svg
        className={`h-2 w-2 transition-colors ${direction === "asc" ? "text-indigo-600" : "text-gray-300"}`}
        viewBox="0 0 8 5"
        fill="currentColor"
      >
        <path d="M4 0L8 5H0z" />
      </svg>
      <svg
        className={`h-2 w-2 transition-colors ${direction === "desc" ? "text-indigo-600" : "text-gray-300"}`}
        viewBox="0 0 8 5"
        fill="currentColor"
      >
        <path d="M4 5L0 0h8z" />
      </svg>
    </span>
  );
}

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------
export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  onSelectionChange,
  emptyState,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Prepend a checkbox column
  const selectionColumn: ColumnDef<TData, unknown> = {
    id: "__select__",
    header: ({ table }) => (
      <input
        type="checkbox"
        aria-label="Select all rows"
        checked={table.getIsAllPageRowsSelected()}
        ref={(el) => {
          if (el) el.indeterminate = table.getIsSomePageRowsSelected();
        }}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        aria-label={`Select row ${row.index + 1}`}
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onChange={row.getToggleSelectedHandler()}
        onClick={(e) => e.stopPropagation()}
        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
      />
    ),
    enableSorting: false,
    size: 48,
  };

  const table = useReactTable({
    data,
    columns: [selectionColumn, ...columns],
    state: { sorting, rowSelection },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowSelectionChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(next);
      if (onSelectionChange) {
        const selectedRows = Object.keys(next)
          .filter((key) => next[key])
          .map((key) => data[parseInt(key, 10)])
          .filter(Boolean);
        onSelectionChange(selectedRows);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const isEmpty = !isLoading && data.length === 0;

  return (
    /* Responsive wrapper */
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        {/* Head */}
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    scope="col"
                    style={{ width: header.column.columnDef.size }}
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500
                      ${canSort ? "cursor-pointer select-none hover:text-gray-800" : ""}`}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    aria-sort={
                      sorted === "asc"
                        ? "ascending"
                        : sorted === "desc"
                        ? "descending"
                        : canSort
                        ? "none"
                        : undefined
                    }
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && <SortIcon direction={sorted} />}
                    </span>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>

        {/* Body */}
        <tbody className="divide-y divide-gray-100 bg-white">
          {isLoading ? (
            <TableSkeleton columnCount={columns.length} />
          ) : isEmpty ? (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="px-4 py-16 text-center text-gray-400"
              >
                {emptyState ?? (
                  <div className="flex flex-col items-center gap-2">
                    <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M3 10h18M3 14h18M10 6h4M10 18h4" />
                    </svg>
                    <p className="text-sm font-medium">No results found</p>
                  </div>
                )}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`transition-colors hover:bg-gray-50
                  ${row.getIsSelected() ? "bg-indigo-50" : ""}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-gray-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}