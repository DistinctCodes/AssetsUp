import type { Activity, ChartData, DashboardStatsResponse } from '@/types/dashboard';

export type DashboardRange = '7d' | '30d' | '90d' | '6m' | '12m';

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export const fetchDashboardStats = async (range: DashboardRange, signal?: AbortSignal): Promise<DashboardStatsResponse> => {
  return fetchJson<DashboardStatsResponse>(`/api/dashboard/stats?range=${encodeURIComponent(range)}`, signal);
};

export const fetchActivities = async (range: DashboardRange, signal?: AbortSignal): Promise<Activity[]> => {
  return fetchJson<Activity[]>(`/api/dashboard/activities?range=${encodeURIComponent(range)}`, signal);
};

export const fetchChartData = async (range: DashboardRange, signal?: AbortSignal): Promise<ChartData> => {
  return fetchJson<ChartData>(`/api/dashboard/charts?range=${encodeURIComponent(range)}`, signal);
};