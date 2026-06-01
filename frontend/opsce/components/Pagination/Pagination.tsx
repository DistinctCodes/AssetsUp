"use client";

import { useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

// ---------------------------------------------------------------------------
// Page range builder — returns numbers and "…" ellipsis markers
// ---------------------------------------------------------------------------
const ELLIPSIS = "…" as const;
type PageItem = number | typeof ELLIPSIS;

function buildPageItems(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const items: PageItem[] = [];
  const addPage = (n: number) => items.push(n);
  const addEllipsis = () => {
    if (items[items.length - 1] !== ELLIPSIS) items.push(ELLIPSIS);
  };

  addPage(1);
  if (current > 4) addEllipsis();

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) addPage(i);

  if (current < total - 3) addEllipsis();
  addPage(total);

  return items;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}: PaginationProps) {
  const pageItems = useMemo(() => buildPageItems(page, totalPages), [page, totalPages]);

  const firstItem = Math.min((page - 1) * limit + 1, total);
  const lastItem = Math.min(page * limit, total);

  if (totalPages <= 1 && total === 0) return null;

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
    >
      {/* Summary */}
      <p className="text-sm text-gray-500">
        Showing{" "}
        <span className="font-medium text-gray-700">{firstItem}–{lastItem}</span>{" "}
        of{" "}
        <span className="font-medium text-gray-700">{total}</span> results
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Previous */}
        <PageButton
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Go to previous page"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </PageButton>

        {/* Page numbers */}
        {pageItems.map((item, idx) =>
          item === ELLIPSIS ? (
            <span
              key={`ellipsis-${idx}`}
              aria-hidden="true"
              className="px-2 py-1.5 text-sm text-gray-400 select-none"
            >
              {ELLIPSIS}
            </span>
          ) : (
            <PageButton
              key={item}
              onClick={() => onPageChange(item)}
              isActive={item === page}
              aria-label={`Go to page ${item}`}
              aria-current={item === page ? "page" : undefined}
            >
              {item}
            </PageButton>
          )
        )}

        {/* Next */}
        <PageButton
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Go to next page"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </PageButton>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Internal PageButton
// ---------------------------------------------------------------------------
interface PageButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  children: React.ReactNode;
}

function PageButton({ isActive, children, className, ...props }: PageButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={`min-w-[2rem] rounded-md px-2 py-1.5 text-sm font-medium transition
        focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
        disabled:pointer-events-none disabled:opacity-40
        ${
          isActive
            ? "bg-indigo-600 text-white shadow-sm"
            : "text-gray-600 hover:bg-gray-100"
        }
        ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}