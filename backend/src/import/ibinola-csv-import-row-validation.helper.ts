import { buildImportPlan, ImportColumn, ImportPlan, InvalidRow, ValidRow } from './csv-row-validator';

export interface ValidatedImportResult<T> {
  imported: T[];
  valid: ValidRow[];
  invalid: InvalidRow[];
  totalRows: number;
  dryRun: boolean;
}

export function validateCsvImportRows(
  csvText: string | null | undefined,
  columns: ImportColumn[],
): ImportPlan {
  return buildImportPlan(csvText, columns);
}

export function applyValidatedImport<T>(
  csvText: string | null | undefined,
  columns: ImportColumn[],
  mapRow: (record: Record<string, string>) => T,
  options: { dryRun?: boolean } = {},
): ValidatedImportResult<T> {
  const plan = validateCsvImportRows(csvText, columns);
  const dryRun = options.dryRun === true;
  const imported = dryRun ? [] : plan.valid.map((row) => mapRow(row.record));
  return {
    imported,
    valid: plan.valid,
    invalid: plan.invalid,
    totalRows: plan.totalRows,
    dryRun,
  };
}
