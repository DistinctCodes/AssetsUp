import {
  CSV_CONTENT_TYPE,
  buildCsvExport,
  escapeCsvValue,
  sanitizeFilename,
  toCsv,
} from './report-export';

interface Row {
  name: string;
  amount: number;
  note: string | null;
}

const COLUMNS = [
  { key: 'name' as const, header: 'Asset' },
  { key: 'amount' as const, header: 'Amount' },
  { key: 'note' as const, header: 'Note' },
];

const ROWS: Row[] = [
  { name: 'Laptop', amount: 1500, note: 'ok' },
  { name: 'Desk, chair', amount: 250.5, note: null },
];

describe('escapeCsvValue', () => {
  it('renders blanks as empty fields', () => {
    expect(escapeCsvValue(null)).toBe('');
    expect(escapeCsvValue(undefined)).toBe('');
  });

  it('quotes values containing a comma, quote or newline', () => {
    expect(escapeCsvValue('a,b')).toBe('"a,b"');
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"');
  });

  it('leaves plain values unquoted', () => {
    expect(escapeCsvValue('Acme')).toBe('Acme');
    expect(escapeCsvValue(42)).toBe('42');
  });

  it('formats dates as ISO', () => {
    expect(escapeCsvValue(new Date('2026-01-05T00:00:00.000Z'))).toBe(
      '2026-01-05T00:00:00.000Z',
    );
  });
});

describe('sanitizeFilename', () => {
  it('slugifies a report name', () => {
    expect(sanitizeFilename('Depreciation Report')).toBe('depreciation-report');
  });

  it('falls back when nothing usable remains', () => {
    expect(sanitizeFilename('***')).toBe('report');
  });
});

describe('toCsv', () => {
  it('writes a header and one line per row', () => {
    expect(toCsv(ROWS, COLUMNS)).toBe(
      ['Asset,Amount,Note', 'Laptop,1500,ok', '"Desk, chair",250.5,'].join('\n'),
    );
  });

  it('writes only the header for no rows', () => {
    expect(toCsv([], COLUMNS)).toBe('Asset,Amount,Note');
  });

  it('renders missing values as empty fields', () => {
    expect(toCsv([{ name: 'X' } as Row], COLUMNS)).toBe('Asset,Amount,Note\nX,,');
  });
});

describe('buildCsvExport', () => {
  it('returns a dated filename and the csv content type', () => {
    const file = buildCsvExport('Depreciation Report', ROWS, COLUMNS, new Date('2026-01-05T10:00:00.000Z'));
    expect(file.filename).toBe('depreciation-report-2026-01-05.csv');
    expect(file.contentType).toBe(CSV_CONTENT_TYPE);
    expect(file.body).toContain('Asset,Amount,Note');
  });
});
