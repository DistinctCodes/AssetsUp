import { clsx } from 'clsx';
import { AssetStatus } from '@/lib/query/types/asset';

export const ASSET_STATUS_CONFIG: Record<AssetStatus, { label: string; className: string }> = {
  [AssetStatus.AVAILABLE]: { label: 'Available', className: 'bg-green-100 text-green-800' },
  [AssetStatus.ASSIGNED]: { label: 'Assigned', className: 'bg-blue-100 text-blue-800' },
  [AssetStatus.IN_MAINTENANCE]: { label: 'In maintenance', className: 'bg-yellow-100 text-yellow-900' },
  [AssetStatus.IN_TRANSIT]: { label: 'In transit', className: 'bg-indigo-100 text-indigo-800' },
  [AssetStatus.RETIRED]: { label: 'Retired', className: 'bg-gray-100 text-gray-700' },
  [AssetStatus.DISPOSED]: { label: 'Disposed', className: 'bg-slate-200 text-slate-700' },
  [AssetStatus.LOST]: { label: 'Lost', className: 'bg-red-100 text-red-800' },
};

/** Human label for a status, falling back to the raw value for anything unknown. */
export function assetStatusLabel(status: string): string {
  return ASSET_STATUS_CONFIG[status as AssetStatus]?.label ?? status;
}

export function StatusBadge({ status }: { status: AssetStatus }) {
  const config = ASSET_STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' };
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}
