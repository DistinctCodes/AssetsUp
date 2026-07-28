'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { format } from 'date-fns';
import { Package, CheckCircle2, UserCheck, Wrench, SlidersHorizontal, Check, RotateCcw, Plus, Eye } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useAuthStore } from '@/store/auth.store';
import { useReportsSummary } from '@/lib/query/hooks/useReports';
import {
  WidgetId,
  ALL_WIDGETS,
  DEFAULT_WIDGET_ORDER,
  WidgetRenderer,
} from '@/components/dashboard/dashboard-widgets';
import { SortableWidget } from '@/components/dashboard/sortable-widget';

interface UserDashboardPrefs {
  order: WidgetId[];
  hidden: WidgetId[];
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError } = useReportsSummary();

  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(DEFAULT_WIDGET_ORDER);
  const [hiddenWidgets, setHiddenWidgets] = useState<WidgetId[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const storageKey = `assetsup_dashboard_prefs_${user?.id || 'default'}`;

  // Hydrate preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: UserDashboardPrefs = JSON.parse(saved);
        if (Array.isArray(parsed.order) && parsed.order.length > 0) {
          const validOrder = parsed.order.filter((id) =>
            ALL_WIDGETS.some((w) => w.id === id)
          );
          const missing = DEFAULT_WIDGET_ORDER.filter(
            (id) => !validOrder.includes(id)
          );
          setWidgetOrder([...validOrder, ...missing]);
        }
        if (Array.isArray(parsed.hidden)) {
          setHiddenWidgets(parsed.hidden);
        }
      }
    } catch {
      // localStorage unavailable
    } finally {
      setIsHydrated(true);
    }
  }, [storageKey]);

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id as WidgetId);
        const newIndex = items.indexOf(over.id as WidgetId);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  function handleHideWidget(id: WidgetId) {
    if (!hiddenWidgets.includes(id)) {
      setHiddenWidgets((prev) => [...prev, id]);
    }
  }

  function handleShowWidget(id: WidgetId) {
    setHiddenWidgets((prev) => prev.filter((wId) => wId !== id));
  }

  function handleSavePreferences() {
    try {
      const prefs: UserDashboardPrefs = {
        order: widgetOrder,
        hidden: hiddenWidgets,
      };
      localStorage.setItem(storageKey, JSON.stringify(prefs));
    } catch {
      // Ignore
    }
    setIsEditing(false);
  }

  function handleResetDefault() {
    setWidgetOrder(DEFAULT_WIDGET_ORDER);
    setHiddenWidgets([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
    setIsEditing(false);
  }

  const visibleWidgets = widgetOrder.filter((id) => !hiddenWidgets.includes(id));
  const hiddenWidgetObjects = ALL_WIDGETS.filter((w) => hiddenWidgets.includes(w.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{user ? `, ${user.firstName}` : ''}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Here&apos;s an overview of your assets</p>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleResetDefault}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to Default
              </button>
              <button
                type="button"
                onClick={handleSavePreferences}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                Done Customising
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-2xs transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4 text-gray-500" />
              Customise Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Editing Mode Banner & Hidden Widgets Drawer */}
      {isEditing && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                Edit Mode Active
              </p>
              <p className="text-xs text-indigo-700 mt-0.5">
                Drag cards by their handle to reorder, or click Hide to remove cards from view.
              </p>
            </div>
          </div>

          {hiddenWidgetObjects.length > 0 && (
            <div className="pt-2 border-t border-indigo-200/80">
              <p className="text-xs font-semibold text-indigo-900 mb-2">Hidden Cards ({hiddenWidgetObjects.length}):</p>
              <div className="flex flex-wrap gap-2">
                {hiddenWidgetObjects.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleShowWidget(w.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-indigo-200 text-indigo-800 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{w.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Grid */}
      {isError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-600">
          Failed to load summary data. Please try refreshing the page.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={visibleWidgets} strategy={rectSortingStrategy}>
            <div className="space-y-6">
              {visibleWidgets.map((id) => (
                <SortableWidget
                  key={id}
                  id={id}
                  isEditing={isEditing}
                  onHideWidget={handleHideWidget}
                >
                  <WidgetRenderer id={id} data={data} isLoading={isLoading || !isHydrated} />
                </SortableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {visibleWidgets.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center bg-gray-50/50">
          <Eye className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm font-medium text-gray-700">All dashboard widgets are currently hidden.</p>
          <p className="text-xs text-gray-500 mt-1">
            Click &quot;Customise Dashboard&quot; or &quot;Reset to Default&quot; to restore your cards.
          </p>
        </div>
      )}
    </div>
  );
}
