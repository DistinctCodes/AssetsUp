'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, EyeOff } from 'lucide-react';
import { WidgetId, ALL_WIDGETS } from './dashboard-widgets';

interface SortableWidgetProps {
  id: WidgetId;
  isEditing: boolean;
  onHideWidget?: (id: WidgetId) => void;
  children: React.ReactNode;
}

export function SortableWidget({ id, isEditing, onHideWidget, children }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const widgetConfig = ALL_WIDGETS.find((w) => w.id === id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative transition-shadow ${
        isEditing ? 'rounded-2xl border-2 border-dashed border-indigo-300 p-2.5 bg-indigo-50/20' : ''
      }`}
    >
      {isEditing && (
        <div className="flex items-center justify-between bg-white border border-indigo-100 rounded-xl px-3.5 py-2 mb-2 shadow-xs">
          <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
            <GripVertical className="text-slate-400 hover:text-slate-700 h-4 w-4" />
            <span className="text-xs font-semibold text-slate-800">{widgetConfig?.title ?? id}</span>
          </div>

          <button
            type="button"
            onClick={() => onHideWidget?.(id)}
            title="Hide Widget"
            className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded transition-colors"
          >
            <EyeOff className="h-3.5 w-3.5" />
            <span>Hide</span>
          </button>
        </div>
      )}

      {children}
    </div>
  );
}
