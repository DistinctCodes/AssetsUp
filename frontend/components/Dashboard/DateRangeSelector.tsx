'use client';

import { useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Calendar } from 'lucide-react';

export type DateRangePreset = '7d' | '30d' | '90d' | '1y' | 'custom';

const PRESETS: { label: string; value: DateRangePreset }[] = [
  { label: '7 days',  value: '7d'  },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
  { label: '1 year',  value: '1y'  },
];

interface DateRangeSelectorProps {
  /** Called when the range changes. `from` and `to` are ISO date strings. */
  onChange?: (range: { from: string; to: string }) => void;
}

/**
 * Date range selector that reflects its state in URL search params
 * (?from=YYYY-MM-DD&to=YYYY-MM-DD&preset=30d).
 * Views are shareable and survive page reload.
 */
export function DateRangeSelector({ onChange }: DateRangeSelectorProps) {
  const router     = useRouter();
  const pathname   = usePathname();
  const params     = useSearchParams();

  const currentPreset = (params.get('preset') as DateRangePreset) ?? '30d';
  const fromParam     = params.get('from') ?? '';
  const toParam       = params.get('to')   ?? '';

  /** Compute ISO dates from a preset string */
  const presetToDates = useCallback((preset: DateRangePreset): { from: string; to: string } => {
    const to   = new Date();
    const from = new Date();
    const map: Record<Exclude<DateRangePreset, 'custom'>, number> = {
      '7d':  7,
      '30d': 30,
      '90d': 90,
      '1y':  365,
    };
    if (preset !== 'custom') {
      from.setDate(from.getDate() - map[preset]);
    }
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    return { from: fmt(from), to: fmt(to) };
  }, []);

  const pushParams = useCallback(
    (preset: DateRangePreset, from: string, to: string) => {
      const sp = new URLSearchParams(Array.from(params.entries()));
      sp.set('preset', preset);
      sp.set('from', from);
      sp.set('to', to);
      router.push(`${pathname}?${sp.toString()}`);
      onChange?.({ from, to });
    },
    [params, pathname, router, onChange],
  );

  const handlePreset = (preset: DateRangePreset) => {
    const { from, to } = presetToDates(preset);
    pushParams(preset, from, to);
  };

  const handleCustomFrom = (e: React.ChangeEvent<HTMLInputElement>) => {
    pushParams('custom', e.target.value, toParam || new Date().toISOString().split('T')[0]);
  };

  const handleCustomTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    pushParams('custom', fromParam, e.target.value);
  };

  const computedValue = currentPreset === 'custom' 
    ? { from: fromParam, to: toParam } 
    : presetToDates(currentPreset);

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Date range selector">
      <Calendar size={15} className="text-gray-400 hidden sm:block" aria-hidden="true" />

      {/* Preset buttons */}
      {PRESETS.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => handlePreset(value)}
          aria-pressed={currentPreset === value}
          className={[
            'px-3 py-1.5 text-xs rounded-lg border transition-colors min-h-[36px]',
            currentPreset === value
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400',
          ].join(' ')}
        >
          {label}
        </button>
      ))}

      {/* Custom date inputs */}
      <div className="flex items-center gap-1.5">
        <label className="sr-only" htmlFor="date-from">From</label>
        <input
          id="date-from"
          type="date"
          value={computedValue.from}
          onChange={handleCustomFrom}
          max={toParam || undefined}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 min-h-[36px] focus:outline-none focus:ring-2 focus:ring-gray-900"
          aria-label="Start date"
        />
        <span className="text-xs text-gray-400">to</span>
        <label className="sr-only" htmlFor="date-to">To</label>
        <input
          id="date-to"
          type="date"
          value={computedValue.to}
          onChange={handleCustomTo}
          min={fromParam || undefined}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 min-h-[36px] focus:outline-none focus:ring-2 focus:ring-gray-900"
          aria-label="End date"
        />
      </div>
    </div>
  );
}
