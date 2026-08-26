export interface ColumnPreference {
  id: string;
  visible: boolean;
  order: number;
}

export interface SavedView {
  id: string;
  name: string;
  columns: ColumnPreference[];
  filters: Record<string, any>;
  sort: { field: string; direction: 'asc' | 'desc' } | null;
  createdAt: string;
}

const STORAGE_KEY_PREFIX = 'assetsup_table_views';

function getStorageKey(tableName: string): string {
  return `${STORAGE_KEY_PREFIX}_${tableName}`;
}

export function getColumnPreferences(tableName: string): ColumnPreference[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(getStorageKey(tableName));
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveColumnPreferences(
  tableName: string,
  preferences: ColumnPreference[],
): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getStorageKey(tableName), JSON.stringify(preferences));
}

export function getSavedViews(tableName: string): SavedView[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(`${getStorageKey(tableName)}_views`);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveView(tableName: string, view: SavedView): void {
  if (typeof window === 'undefined') return;
  const views = getSavedViews(tableName);
  const existingIndex = views.findIndex((v) => v.id === view.id);
  if (existingIndex >= 0) {
    views[existingIndex] = view;
  } else {
    views.push(view);
  }
  localStorage.setItem(
    `${getStorageKey(tableName)}_views`,
    JSON.stringify(views),
  );
}

export function deleteView(tableName: string, viewId: string): void {
  if (typeof window === 'undefined') return;
  const views = getSavedViews(tableName).filter((v) => v.id !== viewId);
  localStorage.setItem(
    `${getStorageKey(tableName)}_views`,
    JSON.stringify(views),
  );
}

export function getDefaultViewId(tableName: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`${getStorageKey(tableName)}_default`);
}

export function setDefaultViewId(tableName: string, viewId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${getStorageKey(tableName)}_default`, viewId);
}

export function filtersToQueryParams(
  filters: Record<string, any>,
): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  return params;
}

export function queryParamsToFilters(
  searchParams: URLSearchParams,
): Record<string, any> {
  const filters: Record<string, any> = {};
  searchParams.forEach((value, key) => {
    filters[key] = value;
  });
  return filters;
}
