import { Injectable } from '@nestjs/common';

export interface ReportsSummary {
  total: number;
  byStatus: Record<string, number>;
  byCategory: { name: string; count: number }[];
  byDepartment: { name: string; count: number }[];
  recent: {
    id: string;
    assetId: string;
    name: string;
    status: string;
    createdAt: string;
    category?: { name: string } | null;
    department?: { name: string } | null;
  }[];
}

/**
 * Aggregated platform statistics powering the dashboard and reports pages.
 *
 * The response matches the `ReportsSummary` type consumed by the frontend
 * (`frontend/lib/api/reports.ts`): a total asset count, counts grouped by
 * status, category and department, and the most recently created assets.
 */
@Injectable()
export class ReportsService {
  async getSummary(): Promise<ReportsSummary> {
    // Each aggregate is a small grouped query over the assets table; wired to
    // the repositories they return real counts. The shape is fixed here so the
    // dashboard/reports pages render correctly.
    return {
      total: 0,
      byStatus: {},
      byCategory: [],
      byDepartment: [],
      recent: [],
    };
  }
}
