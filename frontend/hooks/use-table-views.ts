'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  ColumnPreference,
  SavedView,
  getColumnPreferences,
  saveColumnPreferences,
  getSavedViews,
  saveView,
  deleteView,
  getDefaultViewId,
  setDefaultViewId,
} from '../lib/table-views';

export interface UseTableViewOptions {
  tableName: string;
  defaultColumns: string[];
}

export interface UseTableViewReturn {
  columnPreferences: ColumnPreference[];
  savedViews: SavedView[];
  activeViewId: string | null;
  setColumnPreference: (columnId: string, preference: Partial<ColumnPreference>) => void;
  reorderColumns: (fromIndex: number, toIndex: number) => void;
  saveCurrentView: (name: string) => SavedView;
  loadView: (viewId: string) => SavedView | null;
  removeView: (viewId: string) => void;
  setDefaultView: (viewId: string) => void;
  resetToDefaults: () => void;
}

export function useTableView({
  tableName,
  defaultColumns,
}: UseTableViewOptions): UseTableViewReturn {
  const [columnPreferences, setColumnPreferences] = useState<ColumnPreference[]>(
    () => {
      const stored = getColumnPreferences(tableName);
      if (stored.length > 0) return stored;
      return defaultColumns.map((id, index) => ({
        id,
        visible: true,
        order: index,
      }));
    },
  );

  const [savedViews, setSavedViews] = useState<SavedView[]>(() =>
    getSavedViews(tableName),
  );

  const [activeViewId, setActiveViewId] = useState<string | null>(() =>
    getDefaultViewId(tableName),
  );

  useEffect(() => {
    saveColumnPreferences(tableName, columnPreferences);
  }, [tableName, columnPreferences]);

  useEffect(() => {
    setSavedViews(getSavedViews(tableName));
  }, [tableName]);

  const setColumnPreference = useCallback(
    (columnId: string, preference: Partial<ColumnPreference>) => {
      setColumnPreferences((prev) => {
        const existing = prev.find((c) => c.id === columnId);
        if (existing) {
          return prev.map((c) =>
            c.id === columnId ? { ...c, ...preference } : c,
          );
        }
        return [
          ...prev,
          {
            id: columnId,
            visible: true,
            order: prev.length,
            ...preference,
          },
        ];
      });
    },
    [],
  );

  const reorderColumns = useCallback((fromIndex: number, toIndex: number) => {
    setColumnPreferences((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const [moved] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, moved);
      return sorted.map((item, index) => ({ ...item, order: index }));
    });
  }, []);

  const saveCurrentView = useCallback(
    (name: string): SavedView => {
      const view: SavedView = {
        id: `view_${Date.now()}`,
        name,
        columns: columnPreferences,
        filters: {},
        sort: null,
        createdAt: new Date().toISOString(),
      };
      saveView(tableName, view);
      setSavedViews(getSavedViews(tableName));
      return view;
    },
    [tableName, columnPreferences],
  );

  const loadView = useCallback(
    (viewId: string): SavedView | null => {
      const view = savedViews.find((v) => v.id === viewId);
      if (view) {
        setColumnPreferences(view.columns);
        setActiveViewId(viewId);
      }
      return view || null;
    },
    [savedViews],
  );

  const removeView = useCallback(
    (viewId: string) => {
      deleteView(tableName, viewId);
      setSavedViews(getSavedViews(tableName));
      if (activeViewId === viewId) {
        setActiveViewId(null);
      }
    },
    [tableName, activeViewId],
  );

  const setDefaultView = useCallback(
    (viewId: string) => {
      setDefaultViewId(tableName, viewId);
      setActiveViewId(viewId);
    },
    [tableName],
  );

  const resetToDefaults = useCallback(() => {
    const defaults = defaultColumns.map((id, index) => ({
      id,
      visible: true,
      order: index,
    }));
    setColumnPreferences(defaults);
    setActiveViewId(null);
  }, [defaultColumns]);

  return {
    columnPreferences,
    savedViews,
    activeViewId,
    setColumnPreference,
    reorderColumns,
    saveCurrentView,
    loadView,
    removeView,
    setDefaultView,
    resetToDefaults,
  };
}
