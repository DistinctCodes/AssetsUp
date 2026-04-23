import { clsx } from 'clsx';
import { AssetStatus } from '@/lib/query/types/asset';

type StatusValue = AssetStatus | (string & {});

const statusStyles: Record<AssetStatus, { label: string; className: string; dotClassName: string }> = {
  [AssetStatus.ACTIVE]: {
    label: 'Active',
    className: 'bg-green-100 text-green-700',
    dotClassName: 'bg-green-500',
  },
  [AssetStatus.ASSIGNED]: {
    label: 'Assigned',
    className: 'bg-blue-100 text-blue-700',
    dotClassName: 'bg-blue-500',
  },
  [AssetStatus.MAINTENANCE]: {
    label: 'Maintenance',
    className: 'bg-yellow-100 text-yellow-700',
    dotClassName: 'bg-yellow-500',
  },
  [AssetStatus.RETIRED]: {
    label: 'Retired',
    className: 'bg-slate-100 text-slate-600',
    dotClassName: 'bg-slate-400',
  },
};

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function StatusBadge({ status }: { status: StatusValue }) {
  const fallback = {
    label: formatLabel(status),
    className: 'bg-slate-100 text-slate-600',
    dotClassName: 'bg-slate-400',
  };
  const config = statusStyles[status as AssetStatus] ?? fallback;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
        config.className,
      )}
    >
      <span className={clsx('h-2 w-2 rounded-full', config.dotClassName)} aria-hidden="true" />
      {config.label}
    </span>
  );
}
