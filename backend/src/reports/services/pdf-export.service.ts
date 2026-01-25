
import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

@Injectable()
export class PdfExportService {
  async generate(
    data: any[],
    reportName: string,
    configuration?: any,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc
          .fontSize(20)
          .text(reportName, { align: 'center' })
          .moveDown();

        // Timestamp
        doc
          .fontSize(10)
          .text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' })
          .moveDown();

        if (data.length === 0) {
          doc.fontSize(12).text('No data available', { align: 'center' });
          doc.end();
          return;
        }

        // Table headers
        const headers = Object.keys(data[0]);
        const columnWidth = (doc.page.width - 100) / headers.length;

        doc.fontSize(10).font('Helvetica-Bold');
        let x = 50;
        headers.forEach((header) => {
          doc.text(header, x, doc.y, { width: columnWidth, align: 'left' });
          x += columnWidth;
        });

        doc.moveDown();
        doc.font('Helvetica');

        // Table data
        data.forEach((row, index) => {
          if (doc.y > doc.page.height - 100) {
            doc.addPage();
          }

          x = 50;
          const y = doc.y;
          headers.forEach((header) => {
            const value = row[header]?.toString() || '';
            doc.text(value, x, y, { width: columnWidth, align: 'left' });
            x += columnWidth;
          });
          doc.moveDown(0.5);
        });

        // Footer
        doc
          .fontSize(8)
          .text(
            `Total Records: ${data.length}`,
            50,
            doc.page.height - 50,
            { align: 'center' },
          );

        doc.end();
      } catch (error) {
        reject(new Error(`PDF generation failed: ${error.message}`));
      }
    });
  }
}