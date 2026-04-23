import { CSSProperties } from 'react';
import { clsx } from 'clsx';

interface LoadingSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function LoadingSkeleton({
  rows = 5,
  columns = 1,
  className,
}: LoadingSkeletonProps) {
  const gridStyle = {
    gridTemplateColumns: `repeat(${Math.max(columns, 1)}, minmax(0, 1fr))`,
  } satisfies CSSProperties;

  return (
    <div className={clsx('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid gap-3" style={gridStyle}>
          {Array.from({ length: Math.max(columns, 1) }).map((__, columnIndex) => (
            <div
              key={`row-${rowIndex}-column-${columnIndex}`}
              className="animate-pulse rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="h-4 rounded-full bg-slate-200" />
              <div className="mt-3 h-4 w-3/4 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
