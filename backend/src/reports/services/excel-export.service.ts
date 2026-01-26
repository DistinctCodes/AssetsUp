import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExcelExportService {
  async generate(
    data: any[],
    sheetName: string = 'Report',
    configuration?: any,
  ): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetName);

      if (data.length === 0) {
        return await workbook.xlsx.writeBuffer() as Buffer;
      }

      // Add headers
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);

      // Style headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      // Add data
      data.forEach((item) => {
        const row = headers.map((header) => item[header]);
        worksheet.addRow(row);
      });

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 50);
      });

      // Add aggregations if present
      if (configuration?.aggregations) {
        const aggRow = worksheet.addRow([]);
        aggRow.font = { bold: true, italic: true };
        aggRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF0E0' },
        };
      }

      return await workbook.xlsx.writeBuffer() as Buffer;
    } catch (error) {
      throw new Error(`Excel generation failed: ${error.message}`);
    }
  }
}
