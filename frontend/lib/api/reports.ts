import { api } from '../api';
import { AssetStatus } from '../query/types/asset';

export interface ReportsSummary {
  total: number;
  byStatus: Record<AssetStatus, number>;
  byCategory: { name: string; count: number }[];
  byDepartment: { name: string; count: number }[];
  recent: {
    id: string;
    assetId: string;
    name: string;
    status: AssetStatus;
    createdAt: string;
    category?: { name: string } | null;
    department?: { name: string } | null;
  }[];
}

export const reportsApiClient = {
  getSummary: (): Promise<ReportsSummary> =>
    api.get<ReportsSummary>('/reports/summary').then((r) => r.data),
};
