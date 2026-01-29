'use client';

import StatsSection from '@/components/dashboard/statsSection';
import ActivityFeed from '@/components/dashboard/activityFeed';
import QuickActions from '@/components/dashboard/quickActions';
import StatusBreakdown from '@/components/dashboard/statusBreakdown';
import DepartmentBreakdown from '@/components/dashboard/departmentBreakdown';
import RegistrationChart from '@/components/dashboard/registrationChart';
import CategoryChart from '@/components/dashboard/categoryChart';
import { Calendar, Sparkles, Radio, GripVertical, RotateCcw } from 'lucide-react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { useEffect } from 'react';
import type { DashboardRange } from '@/lib/api/dashboard';
import type { CSSProperties, ReactNode } from 'react';

type WidgetId =
  | 'stats'
  | 'status'
  | 'department'
  | 'registration'
  | 'category'
  | 'activity'
  | 'actions'
  | 'charts'; // legacy id for migration only

function DraggableWidget({
  id,
  children,
  customize,
  className,
  title,
}: {
  id: WidgetId;
  children: ReactNode;
  customize: boolean;
  className?: string;
  title: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !customize,
  });

  const style: CSSProperties | undefined = customize
    ? { transform: CSS.Transform.toString(transform), transition }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(customize ? { ...attributes, ...listeners } : {})}
      className={[
        className || '',
        'h-full flex flex-col',
        customize ? 'relative' : '',
        isDragging ? 'opacity-80' : '',
      ].join(' ')}
    >
      {customize ? (
        <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
          <div className="rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-1 text-[11px] font-medium text-slate-300">
            {title}
          </div>
          <button
            type="button"
            aria-label={title}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/70 bg-slate-950/70 text-slate-300"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const rangeState = useLocalStorageState<DashboardRange>('dashboard.range', '30d');
  const liveState = useLocalStorageState<boolean>('dashboard.live', true);
  const refreshState = useLocalStorageState<number>('dashboard.refreshMs', 30000);
  const customizeState = useLocalStorageState<boolean>('dashboard.customize', false);
  const orderState = useLocalStorageState<WidgetId[]>('dashboard.widgetOrder', [
    'stats',
    'status',
    'department',
    'registration',
    'category',
    'activity',
    'actions',
  ]);

  // Layout migration: ensure new widgets appear even if user has an older saved layout.
  useEffect(() => {
    if (!orderState.isHydrated) return;
    const required: WidgetId[] = [
      'stats',
      'status',
      'department',
      'registration',
      'category',
      'activity',
      'actions',
    ];
    const current = Array.isArray(orderState.value) ? orderState.value : [];

    // If old layout used a single "charts" widget, replace it with registration + category.
    let normalized: WidgetId[] = current.flatMap((id) =>
      id === ('charts' as WidgetId) ? (['registration', 'category'] as WidgetId[]) : [id],
    );

    // Remove duplicates while preserving order
    const seen = new Set<WidgetId>();
    normalized = normalized.filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const missing = required.filter((id) => !normalized.includes(id));
    if (missing.length === 0 && normalized.length === required.length) return;

    // Insert department right after status; registration & category after department; others at the end.
    let next = [...normalized];
    for (const id of missing) {
      if (id === 'department') {
        const statusIdx = next.indexOf('status');
        const insertAt = statusIdx >= 0 ? statusIdx + 1 : 1;
        next = [...next.slice(0, insertAt), 'department', ...next.slice(insertAt)];
      } else if (id === 'registration') {
        const deptIdx = next.indexOf('department');
        const insertAt = deptIdx >= 0 ? deptIdx + 1 : next.length;
        next = [...next.slice(0, insertAt), 'registration', ...next.slice(insertAt)];
      } else if (id === 'category') {
        const regIdx = next.indexOf('registration');
        const insertAt = regIdx >= 0 ? regIdx + 1 : next.length;
        next = [...next.slice(0, insertAt), 'category', ...next.slice(insertAt)];
      } else {
        next.push(id);
      }
    }
    orderState.setValue(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderState.isHydrated]);

  const range = rangeState.value;
  const live = liveState.value;
  const refreshIntervalMs = live ? refreshState.value : false;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderState.value.indexOf(active.id as WidgetId);
    const newIndex = orderState.value.indexOf(over.id as WidgetId);
    if (oldIndex === -1 || newIndex === -1) return;
    orderState.setValue(arrayMove(orderState.value, oldIndex, newIndex));
  };

  const resetLayout = () => {
    orderState.setValue(['stats', 'status', 'department', 'registration', 'category', 'activity', 'actions']);
  };

  const renderWidget = (id: WidgetId) => {
    const baseClass =
      id === 'activity'
        ? 'lg:col-span-8'
        : id === 'actions'
        ? 'lg:col-span-4'
        : id === 'status' || id === 'department' || id === 'registration' || id === 'category'
        ? 'lg:col-span-6'
        : 'lg:col-span-12';

    if (id === 'stats') {
      return (
        <DraggableWidget
          key={id}
          id={id}
          title="Stats"
          customize={customizeState.value}
          className={baseClass}
        >
          <StatsSection range={range} refreshIntervalMs={refreshIntervalMs} />
        </DraggableWidget>
      );
    }
    if (id === 'status') {
      return (
        <DraggableWidget
          key={id}
          id={id}
          title="Status"
          customize={customizeState.value}
          className={baseClass}
        >
          <StatusBreakdown range={range} refreshIntervalMs={refreshIntervalMs} />
        </DraggableWidget>
      );
    }
    if (id === 'department') {
      return (
        <DraggableWidget
          key={id}
          id={id}
          title="Department"
          customize={customizeState.value}
          className={baseClass}
        >
          <DepartmentBreakdown range={range} refreshIntervalMs={refreshIntervalMs} />
        </DraggableWidget>
      );
    }
    if (id === 'registration') {
      return (
        <DraggableWidget
          key={id}
          id={id}
          title="Registrations"
          customize={customizeState.value}
          className={baseClass}
        >
          <RegistrationChart range={range} refreshIntervalMs={refreshIntervalMs} />
        </DraggableWidget>
      );
    }
    if (id === 'category') {
      return (
        <DraggableWidget
          key={id}
          id={id}
          title="Categories"
          customize={customizeState.value}
          className={baseClass}
        >
          <CategoryChart range={range} refreshIntervalMs={refreshIntervalMs} />
        </DraggableWidget>
      );
    }
    if (id === 'activity') {
      return (
        <DraggableWidget
          key={id}
          id={id}
          title="Recent activity"
          customize={customizeState.value}
          className={baseClass}
        >
          <ActivityFeed range={range} refreshIntervalMs={refreshIntervalMs} />
        </DraggableWidget>
      );
    }
    if (id === 'actions') {
      return (
        <DraggableWidget
          key={id}
          id={id}
          title="Quick actions"
          customize={customizeState.value}
          className={baseClass}
        >
          <QuickActions />
        </DraggableWidget>
      );
    }
    // Legacy 'charts' widget - should be migrated, but handle gracefully
    if (id === 'charts') {
      return null; // Don't render, migration should have replaced it
    }
    // Unknown widget id - don't render anything
    return null;
  };

  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4 py-6 md:px-8 md:py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-slate-900/40 px-5 py-5 md:px-7 md:py-6 shadow-[0_18px_60px_rgba(15,23,42,0.6)]">
          <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen">
            <div className="absolute -top-24 -right-10 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200 shadow-sm mb-3">
                <Sparkles className="h-3 w-3 text-emerald-300" />
                <span>Smart overview of your assets</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-50">
                Asset Intelligence
              </h1>
              <p className="mt-1 text-sm md:text-base text-slate-400">
                Monitor registrations, categories, and department distribution in a single, elegant view.
              </p>
            </div>

            {/* Date Filter (visual only) */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 self-start rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-3 text-xs md:text-sm text-slate-200 shadow-lg shadow-slate-950/40 backdrop-blur">
              <div className="flex items-center gap-2 rounded-lg bg-slate-800/70 px-3 py-2">
                <Calendar className="h-4 w-4 text-sky-400" />
                <div className="flex flex-col leading-tight">
                  <label className="font-medium" htmlFor="dashboard-range">Date range</label>
                  <span className="text-[11px] text-slate-400">Drives stats, charts, and activity</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  id="dashboard-range"
                  value={range}
                  onChange={(e) => rangeState.setValue(e.target.value as DashboardRange)}
                  className="h-9 rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 text-[12px] text-slate-200 outline-none focus:border-sky-500/70"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="6m">Last 6 months</option>
                  <option value="12m">Last 12 months</option>
                </select>

                <button
                  type="button"
                  onClick={() => liveState.setValue(!live)}
                  className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[12px] font-medium transition-colors ${
                    live
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400/60'
                      : 'border-slate-700/70 bg-slate-950/70 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <Radio className="h-4 w-4" />
                  {live ? 'Live' : 'Paused'}
                </button>

                <select
                  value={refreshState.value}
                  onChange={(e) => refreshState.setValue(Number(e.target.value))}
                  disabled={!live}
                  className="h-9 rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 text-[12px] text-slate-200 outline-none focus:border-sky-500/70 disabled:opacity-50"
                  aria-label="Refresh interval"
                >
                  <option value={10000}>10s</option>
                  <option value={30000}>30s</option>
                  <option value={60000}>60s</option>
                </select>

                <button
                  type="button"
                  onClick={() => customizeState.setValue(!customizeState.value)}
                  className={`inline-flex h-9 items-center rounded-lg border px-3 text-[12px] font-medium transition-colors ${
                    customizeState.value
                      ? 'border-sky-500/50 bg-sky-500/10 text-sky-200 hover:border-sky-400/70'
                      : 'border-slate-700/70 bg-slate-950/70 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {customizeState.value ? 'Done' : 'Customize'}
                </button>

                {customizeState.value ? (
                  <button
                    type="button"
                    onClick={resetLayout}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 text-[12px] font-medium text-slate-300 hover:border-slate-600 hover:text-slate-100 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          modifiers={[restrictToParentElement]}
        >
          <SortableContext items={orderState.value} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
              {orderState.value.map((id) => renderWidget(id))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </main>
  );
}