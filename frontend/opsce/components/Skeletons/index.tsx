'use client';

/**
 * Reusable skeleton loading components for all major pages.
 * Uses Tailwind's animate-pulse utility for a consistent loading experience.
 */

// ── TableSkeleton ─────────────────────────────────────────────
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex gap-6">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-24" />
          ))}
        </div>
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="border-b border-gray-100 px-4 py-3">
          <div className="flex gap-6">
            {Array.from({ length: cols }).map((_, colIdx) => (
              <div
                key={colIdx}
                className="h-4 bg-gray-100 rounded"
                style={{ width: `${60 + colIdx * 10}px` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── CardSkeleton ──────────────────────────────────────────────
export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
          <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
          <div className="h-8 w-16 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── DetailPageSkeleton ────────────────────────────────────────
export function DetailPageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Back button */}
      <div className="h-4 w-32 bg-gray-200 rounded" />

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-6 w-64 bg-gray-200 rounded" />
            <div className="h-4 w-48 bg-gray-200 rounded" />
            <div className="flex gap-2 mt-2">
              <div className="h-6 w-20 bg-gray-200 rounded-full" />
              <div className="h-6 w-20 bg-gray-200 rounded-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-24 bg-gray-200 rounded-lg" />
            <div className="h-8 w-24 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200 pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-4 w-20 bg-gray-200 rounded" />
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="flex justify-between mb-3">
                <div className="h-3 w-24 bg-gray-200 rounded" />
                <div className="h-3 w-32 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FormSkeleton ──────────────────────────────────────────────
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="h-5 w-40 bg-gray-200 rounded mb-5" />
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="mb-4">
          <div className="h-3 w-24 bg-gray-200 rounded mb-1.5" />
          <div className="h-9 w-full bg-gray-100 rounded-lg" />
        </div>
      ))}
      <div className="h-9 w-32 bg-gray-200 rounded-lg mt-2" />
    </div>
  );
}

// ── ListSkeleton ──────────────────────────────────────────────
export function ListSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-48 bg-gray-200 rounded" />
            <div className="h-3 w-32 bg-gray-100 rounded" />
          </div>
          <div className="h-8 w-8 bg-gray-100 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
