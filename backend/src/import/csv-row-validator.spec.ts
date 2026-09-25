import { buildImportPlan, parseCsvRows, validateRow, ImportColumn } from './csv-row-validator';

const COLUMNS: ImportColumn[] = [
  { name: 'name', required: true, maxLength: 50 },
  { name: 'code', required: true },
  { name: 'email', validate: (value) => (value.includes('@') ? null : 'email must be valid') },
];

describe('parseCsvRows', () => {
  it('parses simple rows', () => {
    expect(parseCsvRows('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('keeps commas inside quoted fields', () => {
    expect(parseCsvRows('a,"b,c",d')).toEqual([['a', 'b,c', 'd']]);
  });

  it('unescapes doubled quotes', () => {
    expect(parseCsvRows('"say ""hi""",b')).toEqual([['say "hi"', 'b']]);
  });

  it('handles CRLF line endings', () => {
    expect(parseCsvRows('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('ignores blank lines and a trailing newline', () => {
    expect(parseCsvRows('a,b\n\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('keeps empty fields', () => {
    expect(parseCsvRows('a,,c')).toEqual([['a', '', 'c']]);
  });

  it('handles blanks safely', () => {
    expect(parseCsvRows('')).toEqual([]);
    expect(parseCsvRows(null)).toEqual([]);
    expect(parseCsvRows(undefined)).toEqual([]);
  });
});

describe('validateRow', () => {
  it('accepts a complete row', () => {
    const { errors, record } = validateRow(['Acme', 'AC-1', 'a@b.com'], COLUMNS);
    expect(errors).toEqual([]);
    expect(record).toEqual({ name: 'Acme', code: 'AC-1', email: 'a@b.com' });
  });

  it('reports missing required fields per column', () => {
    const { errors } = validateRow(['', '', 'a@b.com'], COLUMNS);
    expect(errors).toEqual([
      { column: 'name', message: 'name is required' },
      { column: 'code', message: 'code is required' },
    ]);
  });

  it('reports a field that is too long', () => {
    const { errors } = validateRow(['x'.repeat(51), 'AC-1', 'a@b.com'], COLUMNS);
    expect(errors[0].message).toContain('at most 50');
  });

  it('runs custom validators', () => {
    const { errors } = validateRow(['Acme', 'AC-1', 'nope'], COLUMNS);
    expect(errors).toEqual([{ column: 'email', message: 'email must be valid' }]);
  });

  it('reports rows with more values than columns', () => {
    const { errors } = validateRow(['Acme', 'AC-1', 'a@b.com', 'extra'], COLUMNS);
    expect(errors).toHaveLength(1);
    expect(errors[0].column).toBe('row');
  });
});

describe('buildImportPlan', () => {
  const CSV = [
    'name,code,email',
    'Acme,AC-1,ops@acme.com',
    ',AC-2,sales@acme.com',
    'Globex,GX-1,not-an-email',
    'Initech,IN-1,hello@initech.com',
  ].join('\n');

  it('imports the valid rows and reports the bad ones', () => {
    const plan = buildImportPlan(CSV, COLUMNS);
    expect(plan.valid.map((row) => row.record.name)).toEqual(['Acme', 'Initech']);
    expect(plan.invalid.map((row) => row.rowNumber)).toEqual([3, 4]);
    expect(plan.totalRows).toBe(4);
    expect(plan.hasErrors).toBe(true);
  });

  it('does not abort the whole import because of one bad row', () => {
    const plan = buildImportPlan(CSV, COLUMNS);
    expect(plan.valid).toHaveLength(2);
  });

  it('numbers rows from the first data row after the header', () => {
    const plan = buildImportPlan(CSV, COLUMNS);
    expect(plan.valid[0].rowNumber).toBe(2);
  });

  it('collects every error for a row', () => {
    const plan = buildImportPlan('name,code,email\n,,bad', COLUMNS);
    expect(plan.invalid[0].errors).toHaveLength(3);
  });

  it('falls back to the header row when no columns are supplied', () => {
    const plan = buildImportPlan('name,code\nAcme,AC-1', []);
    expect(plan.valid[0].record).toEqual({ name: 'Acme', code: 'AC-1' });
  });

  it('handles an empty file', () => {
    expect(buildImportPlan('', COLUMNS)).toEqual({
      valid: [],
      invalid: [],
      totalRows: 0,
      hasErrors: false,
    });
  });
});
