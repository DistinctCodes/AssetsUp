import { ImportColumn } from './csv-row-validator';
import { applyValidatedImport } from './ibinola-csv-import-row-validation.helper';

describe('ibinola-csv-import-row-validation.helper', () => {
  const columns: ImportColumn[] = [
    { name: 'assetTag', required: true },
    { name: 'name', required: true },
  ];

  it('reports bad rows and imports the rest', () => {
    const csv = 'assetTag,name\nAST-1,Laptop\n,MissingTag\nAST-3,Monitor\n';
    const result = applyValidatedImport(csv, columns, (r) => ({ tag: r.assetTag, name: r.name }));
    expect(result.totalRows).toBe(3);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].rowNumber).toBe(3);
    expect(result.valid).toHaveLength(2);
    expect(result.imported).toEqual([
      { tag: 'AST-1', name: 'Laptop' },
      { tag: 'AST-3', name: 'Monitor' },
    ]);
  });

  it('supports dry-run without producing imported records', () => {
    const csv = 'assetTag,name\nAST-1,Laptop\n';
    const result = applyValidatedImport(csv, columns, (r) => r, { dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.valid).toHaveLength(1);
    expect(result.imported).toHaveLength(0);
  });
});
