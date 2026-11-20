import { ReportCache } from './report-cache';
import { exportSummaryCsv, getCachedSummary } from './kike-report-cache-export.helper';

describe('kike-report-cache-export.helper', () => {
  it('serves repeated summary calls from cache within TTL', async () => {
    const cache = new ReportCache<{ total: number }>(300);
    const loader = jest.fn().mockResolvedValue({ total: 5 });
    const first = await getCachedSummary(cache, loader);
    const second = await getCachedSummary(cache, loader);
    expect(first.hit).toBe(false);
    expect(second.hit).toBe(true);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('builds CSV export with correct content disposition', () => {
    const rows = [{ section: 'status', key: 'AVAILABLE', value: 3 }];
    const file = exportSummaryCsv(rows, [
      { key: 'section', header: 'Section' },
      { key: 'key', header: 'Key' },
      { key: 'value', header: 'Value' },
    ], new Date('2026-11-20T00:00:00Z'));
    expect(file.filename).toBe('reports-summary-2026-11-20.csv');
    expect(file.contentDisposition).toBe('attachment; filename="reports-summary-2026-11-20.csv"');
    expect(file.body).toContain('Section,Key,Value');
  });
});
