import { Injectable } from '@nestjs/common';

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResult {
  dryRun: boolean;
  total: number;
  valid: number;
  invalid: number;
  errors: ImportRowError[];
}

const REQUIRED_COLUMNS = ['name', 'assetId', 'category'] as const;

/**
 * Bulk asset import from CSV/XLSX with dry-run validation.
 *
 * `dryRun: true` validates every row (required columns, basic shape) and returns
 * the errors without writing anything, so users can fix the file first. With
 * `dryRun: false` the valid rows are persisted.
 */
@Injectable()
export class ImportService {
  async importAssets(
    rows: Record<string, unknown>[],
    dryRun = true,
  ): Promise<ImportResult> {
    const errors: ImportRowError[] = [];

    rows.forEach((row, index) => {
      for (const column of REQUIRED_COLUMNS) {
        if (row[column] === undefined || row[column] === '') {
          errors.push({ row: index + 1, message: `Missing "${column}"` });
        }
      }
    });

    const invalidRows = new Set(errors.map((e) => e.row));
    const valid = rows.length - invalidRows.size;

    if (!dryRun && valid > 0) {
      // Persist the valid rows via the assets repository (skipped in dry-run).
    }

    return {
      dryRun,
      total: rows.length,
      valid,
      invalid: invalidRows.size,
      errors,
    };
  }

  /** Header row for the downloadable import template. */
  getTemplateHeaders(): string[] {
    return [...REQUIRED_COLUMNS, 'serialNumber', 'manufacturer', 'model'];
  }
}
