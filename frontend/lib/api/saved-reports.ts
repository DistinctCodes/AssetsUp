import { api } from '../api';

export interface SavedReport {
  id: string;
  name: string;
  dataset: string;
  filters: Record<string, string>;
  groupBy: string;
  viewMode: string;
}

export interface CreateSavedReportInput {
  name: string;
  dataset: string;
  filters: Record<string, string>;
  groupBy: string;
  viewMode: string;
}

export const savedReportsApiClient = {
  list: (): Promise<SavedReport[]> =>
    api.get<SavedReport[]>('/saved-reports').then((r) => r.data),

  create: (data: CreateSavedReportInput): Promise<SavedReport> =>
    api.post<SavedReport>('/saved-reports', data).then((r) => r.data),

  rename: (id: string, name: string): Promise<SavedReport> =>
    api.patch<SavedReport>(`/saved-reports/${id}`, { name }).then((r) => r.data),

  delete: (id: string): Promise<void> =>
    api.delete(`/saved-reports/${id}`).then(() => undefined),

  duplicate: (id: string): Promise<SavedReport> =>
    api.post<SavedReport>(`/saved-reports/${id}/duplicate`).then((r) => r.data),
};