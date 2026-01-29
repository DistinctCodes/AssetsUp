'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchActivities, type DashboardRange } from '@/lib/api/dashboard';
import { format } from 'date-fns';
import { UserCircle, ArrowRight, PlusCircle, UserCheck, Archive, ArrowLeftRight } from 'lucide-react';
import Link from 'next/link';

export default function ActivityFeed({
  range,
  refreshIntervalMs,
}: {
  range: DashboardRange;
  refreshIntervalMs: number | false;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-activities', range],
    queryFn: ({ signal }) => fetchActivities(range, signal),
    refetchInterval: refreshIntervalMs,
  });

  if (isLoading) {
    return (
      <div className="h-64 rounded-2xl border border-slate-800/80 bg-slate-900/80 animate-pulse" />
    );
  }

  const getAccentClasses = (actionType: string) => {
    if (actionType === 'created') {
      return 'border-sky-500/40 bg-sky-500/10 text-sky-200';
    }
    if (actionType === 'assigned') {
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
    }
    if (actionType === 'transferred') {
      return 'border-violet-500/40 bg-violet-500/10 text-violet-200';
    }
    if (actionType === 'retired') {
      return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
    }
    return 'border-slate-600/40 bg-slate-800/40 text-slate-200';
  };

  const getActionIcon = (actionType: string) => {
    if (actionType === 'created') return PlusCircle;
    if (actionType === 'assigned') return UserCheck;
    if (actionType === 'transferred') return ArrowLeftRight;
    if (actionType === 'retired') return Archive;
    return UserCircle;
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/80 shadow-[0_18px_60px_rgba(15,23,42,0.8)]">
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-4 md:px-6 md:py-5">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-slate-50">
            Recent activity
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            The latest changes happening across your assets.
          </p>
        </div>
        <Link
          href="/activities"
          className="text-xs md:text-sm font-medium text-sky-300 hover:text-sky-200"
        >
          View all
        </Link>
      </div>
      <div className="max-h-[400px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {data?.map((activity) => (
          <div
            key={activity.id}
            className="group flex items-center gap-4 border-b border-slate-900/80 px-4 py-3 md:px-6 md:py-4 transition-colors hover:bg-slate-900/80"
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl border text-xs shadow-sm ${getAccentClasses(
                activity.actionType,
              )}`}
            >
              {(() => {
                const Icon = getActionIcon(activity.actionType);
                return <Icon size={18} />;
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-100">
                {activity.user}{' '}
                <span className="font-normal text-slate-400">
                  {activity.actionType}
                </span>{' '}
                {activity.assetName}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
              </p>
            </div>
            <Link
              href={`/assets/${activity.assetId}`}
              className="opacity-0 transition-all group-hover:opacity-100 text-slate-500 hover:text-sky-300"
            >
              <ArrowRight size={16} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}