import apiClient from './client';
import { ReportSummary } from '../users';

export async function getReportsSummary(): Promise<ReportSummary> {
  const res = await apiClient.get('/reports/summary');
  return res.data;
}
