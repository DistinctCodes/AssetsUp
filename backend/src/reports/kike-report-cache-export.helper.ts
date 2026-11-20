import { buildCsvExport, ExportColumn, ExportFile } from './report-export';
import { buildReportCacheKey, ReportCache, withReportCache } from './report-cache';

export interface SummaryExportRow {
  section: string;
  key: string;
  value: number | string;
}

export function cachedSummaryKey(params: Record<string, unknown> = {}): string {
  return buildReportCacheKey('reports:summary', params);
}

export async function getCachedSummary<T>(
  cache: ReportCache<T>,
  loader: () => Promise<T>,
  params: Record<string, unknown> = {},
): Promise<{ value: T; hit: boolean; key: string }> {
  const key = cachedSummaryKey(params);
  const outcome = await withReportCache(cache, key, loader);
  return { ...outcome, key };
}

export function exportSummaryCsv<T extends Record<string, unknown>>(
  rows: ReadonlyArray<T>,
  columns: ReadonlyArray<ExportColumn<T>>,
  generatedAt: Date = new Date(),
): ExportFile & { contentDisposition: string } {
  const file = buildCsvExport('reports-summary', rows, columns, generatedAt);
  return {
    ...file,
    contentDisposition: `attachment; filename="${file.filename}"`,
  };
}
