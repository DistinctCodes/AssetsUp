import { clsx } from 'clsx';
import { AssetCondition } from '@/lib/query/types/asset';

const conditionConfig: Record<AssetCondition, { label: string; className: string }> = {
  [AssetCondition.NEW]: { label: 'New', className: 'bg-emerald-100 text-emerald-700' },
  [AssetCondition.GOOD]: { label: 'Good', className: 'bg-green-100 text-green-700' },
  [AssetCondition.FAIR]: { label: 'Fair', className: 'bg-yellow-100 text-yellow-700' },
  [AssetCondition.POOR]: { label: 'Poor', className: 'bg-orange-100 text-orange-700' },
  [AssetCondition.DAMAGED]: { label: 'Damaged', className: 'bg-red-100 text-red-700' },
};

export function ConditionBadge({ condition }: { condition: AssetCondition }) {
  const config = conditionConfig[condition] ?? { label: condition, className: 'bg-gray-100 text-gray-500' };
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}
