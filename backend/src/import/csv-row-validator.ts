export interface ImportColumn {
  name: string;
  required?: boolean;
  maxLength?: number;
  validate?: (value: string) => string | null;
}

export interface RowError {
  column: string;
  message: string;
}

export interface ValidRow {
  rowNumber: number;
  record: Record<string, string>;
}

export interface InvalidRow {
  rowNumber: number;
  errors: RowError[];
}

export interface ImportPlan {
  valid: ValidRow[];
  invalid: InvalidRow[];
  totalRows: number;
  hasErrors: boolean;
}

export function parseCsvRows(text: string | null | undefined): string[][] {
  if (typeof text !== 'string' || text.length === 0) return [];
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
  return rows;
}

export function validateRow(
  values: string[],
  columns: ImportColumn[],
): { record: Record<string, string>; errors: RowError[] } {
  const record: Record<string, string> = {};
  const errors: RowError[] = [];

  columns.forEach((column, index) => {
    const value = (values[index] ?? '').trim();
    record[column.name] = value;
    if (column.required && value.length === 0) {
      errors.push({ column: column.name, message: `${column.name} is required` });
      return;
    }
    if (column.maxLength !== undefined && value.length > column.maxLength) {
      errors.push({
        column: column.name,
        message: `${column.name} must be at most ${column.maxLength} characters`,
      });
      return;
    }
    if (column.validate) {
      const message = column.validate(value);
      if (message) errors.push({ column: column.name, message });
    }
  });

  if (values.length > columns.length) {
    errors.push({
      column: 'row',
      message: `Row has ${values.length} values but ${columns.length} columns are expected`,
    });
  }

  return { record, errors };
}

export function buildImportPlan(
  text: string | null | undefined,
  columns: ImportColumn[],
): ImportPlan {
  const rows = parseCsvRows(text);
  const [header, ...dataRows] = rows;
  const headers = (header ?? []).map((name) => name.trim());
  const resolved: ImportColumn[] = columns.length > 0 ? columns : headers.map((name) => ({ name }));

  const valid: ValidRow[] = [];
  const invalid: InvalidRow[] = [];

  dataRows.forEach((values, index) => {
    const rowNumber = index + 2;
    const { record, errors } = validateRow(values, resolved);
    if (errors.length === 0) valid.push({ rowNumber, record });
    else invalid.push({ rowNumber, errors });
  });

  return {
    valid,
    invalid,
    totalRows: dataRows.length,
    hasErrors: invalid.length > 0,
  };
}
