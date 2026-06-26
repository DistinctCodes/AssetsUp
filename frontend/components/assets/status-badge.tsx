import { clsx } from 'clsx';
import { AssetStatus } from '@/lib/query/types/asset';

const statusConfig: Record<AssetStatus, { label: string; className: string }> = {
  [AssetStatus.ACTIVE]: { label: 'Active', className: 'bg-green-100 text-green-700' },
  [AssetStatus.ASSIGNED]: { label: 'Assigned', className: 'bg-blue-100 text-blue-700' },
  [AssetStatus.MAINTENANCE]: { label: 'Maintenance', className: 'bg-yellow-100 text-yellow-700' },
  [AssetStatus.RETIRED]: { label: 'Retired', className: 'bg-gray-100 text-gray-500' },
};

export function StatusBadge({ status }: { status: AssetStatus }) {
  const config = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-500' };
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}
