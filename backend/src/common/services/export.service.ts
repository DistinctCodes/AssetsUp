import { Injectable } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';

export interface ColumnDefinition {
  header: string;
  key: string;
  width?: number;
}

@Injectable()
export class ExportService {
  /**
   * Formats and streams CSV response with properly escaped fields.
   */
  async streamCsv(
    res: ExpressResponse,
    columns: ColumnDefinition[],
    dataStream: Readable | AsyncIterable<Record<string, any>>,
    filenamePrefix: string,
  ): Promise<void> {
    const filename = `${filenamePrefix}-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write header row
    const headerRow =
      columns.map((col) => this.escapeCsvField(col.header)).join(',') + '\n';
    res.write(headerRow);

    // Stream rows dynamically
    for await (const item of dataStream) {
      const row = columns
        .map((col) => this.escapeCsvField(item[col.key]))
        .join(',');
      res.write(row + '\n');
    }

    res.end();
  }

  /**
   * Generates and streams XLSX file using ExcelJS streaming writer.
   */
  async streamXlsx(
    res: ExpressResponse,
    columns: ColumnDefinition[],
    dataStream: Readable | AsyncIterable<Record<string, any>>,
    filenamePrefix: string,
    sheetName = 'Export Data',
  ): Promise<void> {
    const filename = `${filenamePrefix}-${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Use WorkbookWriter to stream directly to HTTP response
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: res,
      useStyles: true,
      useSharedStrings: true,
    });

    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 20,
    }));

    for await (const item of dataStream) {
      worksheet.addRow(item).commit();
    }

    worksheet.commit();
    await workbook.commit();
  }

  /**
   * Escapes values containing commas, quotes, or newlines according to CSV standards.
   */
  private escapeCsvField(val: any): string {
    if (val === null || val === undefined) return '""';

    let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (
      str.includes('"') ||
      str.includes(',') ||
      str.includes('\n') ||
      str.includes('\r')
    ) {
      str = `"${str.replace(/"/g, '""')}"`;
    } else {
      str = `"${str}"`;
    }
    return str;
  }
}
