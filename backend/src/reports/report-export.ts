export const CSV_CONTENT_TYPE = 'text/csv; charset=utf-8';
export const CSV_EXTENSION = 'csv';

export interface ExportColumn<T> {
  key: keyof T & string;
  header: string;
}

export interface ExportFile {
  filename: string;
  contentType: string;
  body: string;
}

const NEEDS_QUOTING = /[",\r\n]/;

export function sanitizeFilename(value: string): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.length > 0 ? cleaned : 'report';
}

export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return NEEDS_QUOTING.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T>(rows: ReadonlyArray<T>, columns: ReadonlyArray<ExportColumn<T>>): string {
  const header = columns.map((column) => escapeCsvValue(column.header)).join(',');
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvValue(row?.[column.key])).join(','),
  );
  return [header, ...body].join('\n');
}

export function buildCsvExport<T>(
  report: string,
  rows: ReadonlyArray<T>,
  columns: ReadonlyArray<ExportColumn<T>>,
  generatedAt: Date = new Date(),
): ExportFile {
  const datePart = generatedAt.toISOString().slice(0, 10);
  return {
    filename: `${sanitizeFilename(report)}-${datePart}.${CSV_EXTENSION}`,
    contentType: CSV_CONTENT_TYPE,
    body: toCsv(rows, columns),
  };
}
