import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  async generatePdf(
    title: string,
    columns: ExportColumn[],
    rows: Record<string, any>[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = doc.page.width - 100;
        const now = new Date().toLocaleString();

        // Header
        doc
          .fillColor('#1a1a2e')
          .fontSize(24)
          .font('Helvetica-Bold')
          .text('AssetsUp', 50, 50);

        doc
          .fillColor('#666666')
          .fontSize(12)
          .font('Helvetica')
          .text(`Report: ${title}`, 50, 80);

        doc
          .fillColor('#999999')
          .fontSize(10)
          .text(`Generated: ${now}`, 50, 100);

        // Add a line separator
        doc
          .moveTo(50, 115)
          .lineTo(pageWidth + 50, 115)
          .strokeColor('#cccccc')
          .stroke();

        // Table headers
        const startY = 130;
        const colWidths = this.calculateColumnWidths(columns, pageWidth);
        let x = 50;
        let y = startY;

        // Header background
        doc
          .fillColor('#4a4e69')
          .roundedRect(50, y - 15, pageWidth, 25, 3)
          .fill();

        // Header text
        doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
        columns.forEach((col, index) => {
          doc.text(col.header, x, y - 10, { width: colWidths[index] });
          x += colWidths[index];
        });

        // Table rows
        doc.font('Helvetica').fontSize(9);
        y += 20;

        rows.forEach((row, rowIndex) => {
          // Check if we need a new page
          if (y > doc.page.height - 100) {
            doc.addPage();
            y = 50;

            // Re-add headers on new page
            doc
              .fillColor('#4a4e69')
              .roundedRect(50, y - 15, pageWidth, 25, 3)
              .fill();
            doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
            x = 50;
            columns.forEach((col, index) => {
              doc.text(col.header, x, y - 10, { width: colWidths[index] });
              x += colWidths[index];
            });
            doc.font('Helvetica').fontSize(9);
            y += 20;
          }

          // Alternate row background
          if (rowIndex % 2 === 0) {
            doc
              .fillColor('#f8f9fa')
              .roundedRect(50, y - 12, pageWidth, 18, 2)
              .fill();
          }

          // Row data
          doc.fillColor('#333333');
          x = 50;
          columns.forEach((col, index) => {
            const value = row[col.key] ?? '';
            doc.text(String(value), x, y - 8, { width: colWidths[index] });
            x += colWidths[index];
          });

          y += 18;
        });

        // Footer with page numbers
        const totalPages = doc.bufferedPageRange().count;
        for (let i = 0; i < totalPages; i++) {
          doc.switchToPage(i);
          doc
            .fillColor('#999999')
            .fontSize(8)
            .font('Helvetica')
            .text(`Page ${i + 1} of ${totalPages}`, 50, doc.page.height - 50, {
              align: 'center',
            });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateExcel(
    sheetName: string,
    columns: ExportColumn[],
    rows: Record<string, any>[],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName, {
      properties: { tabColor: { argb: '4a4e69' } },
    });

    // Add columns with headers
    const excelColumns = columns.map((col, _index) => ({
      header: col.header,
      key: col.key,
      width: col.width || 15,
    }));

    worksheet.columns = excelColumns;

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4a4e69' },
    };
    worksheet.getRow(1).alignment = { vertical: 'middle' };

    // Add data rows
    rows.forEach((row) => {
      worksheet.addRow(row);
    });

    // Freeze top row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Auto-adjust column widths based on content
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      if (column.eachCell) {
        column.eachCell({ includeEmpty: true }, (cell) => {
          const cellValue = cell.value ? cell.value.toString() : '';
          maxLength = Math.max(maxLength, cellValue.length);
        });
      }
      column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });

    // Add borders to all cells
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  private calculateColumnWidths(
    columns: ExportColumn[],
    totalWidth: number,
  ): number[] {
    const equalWidth = totalWidth / columns.length;
    return columns.map((col) => col.width || equalWidth);
  }
}
