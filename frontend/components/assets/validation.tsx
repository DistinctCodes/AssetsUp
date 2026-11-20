import { clsx } from 'clsx';
import { AssetStatus } from '@/lib/query/types/asset';

const statusConfig: Record<AssetStatus, { label: string; className: string }> = {
  [AssetStatus.AVAILABLE]: { label: 'Available', className: 'bg-green-100 text-green-700' },
  [AssetStatus.ASSIGNED]: { label: 'Assigned', className: 'bg-blue-100 text-blue-700' },
  [AssetStatus.IN_MAINTENANCE]: { label: 'In maintenance', className: 'bg-yellow-100 text-yellow-700' },
  [AssetStatus.IN_TRANSIT]: { label: 'In transit', className: 'bg-indigo-100 text-indigo-700' },
  [AssetStatus.RETIRED]: { label: 'Retired', className: 'bg-gray-100 text-gray-500' },
  [AssetStatus.DISPOSED]: { label: 'Disposed', className: 'bg-slate-200 text-slate-600' },
  [AssetStatus.LOST]: { label: 'Lost', className: 'bg-red-100 text-red-700' },
};

export function StatusBadge({ status }: { status: AssetStatus }) {
  const config = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-500' };
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}
