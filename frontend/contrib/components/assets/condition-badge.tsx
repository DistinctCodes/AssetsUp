import { clsx } from 'clsx';
import { AssetCondition } from '@/lib/query/types/asset';

type ConditionValue = AssetCondition | (string & {});

const conditionStyles: Record<AssetCondition, { label: string; className: string; dotClassName: string }> = {
  [AssetCondition.NEW]: {
    label: 'New',
    className: 'bg-emerald-100 text-emerald-700',
    dotClassName: 'bg-emerald-500',
  },
  [AssetCondition.GOOD]: {
    label: 'Good',
    className: 'bg-green-100 text-green-700',
    dotClassName: 'bg-green-500',
  },
  [AssetCondition.FAIR]: {
    label: 'Fair',
    className: 'bg-yellow-100 text-yellow-700',
    dotClassName: 'bg-yellow-500',
  },
  [AssetCondition.POOR]: {
    label: 'Poor',
    className: 'bg-orange-100 text-orange-700',
    dotClassName: 'bg-orange-500',
  },
  [AssetCondition.DAMAGED]: {
    label: 'Damaged',
    className: 'bg-red-100 text-red-700',
    dotClassName: 'bg-red-500',
  },
};

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function ConditionBadge({ condition }: { condition: ConditionValue }) {
  const fallback = {
    label: formatLabel(condition),
    className: 'bg-slate-100 text-slate-600',
    dotClassName: 'bg-slate-400',
  };
  const config = conditionStyles[condition as AssetCondition] ?? fallback;

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
