import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { ExportService, ExportColumn } from '../../reporting/export.service';
import { MailService } from '../../mail/mail.service';

interface ExportJobData {
  email: string;
  reportName: string;
  format: 'pdf' | 'xlsx';
  columns: ExportColumn[];
  rows: Record<string, any>[];
}

@Processor('export')
export class ExportProcessor {
  private readonly logger = new Logger(ExportProcessor.name);

  constructor(
    private readonly exportService: ExportService,
    private readonly mailService: MailService,
  ) {}

  @Process('generate')
  async handleExport(job: Job<ExportJobData>) {
    const { email, reportName, format, columns, rows } = job.data;

    this.logger.log(
      `Processing export job #${job.id}: ${reportName} (${format}) for ${email}`,
    );

    try {
      let buffer: Buffer;
      let filename: string;
      let contentType: string;

      if (format === 'pdf') {
        buffer = await this.exportService.generatePdf(
          reportName,
          columns,
          rows,
        );
        const date = new Date().toISOString().split('T')[0];
        filename = `report-${date}.pdf`;
        contentType = 'application/pdf';
      } else {
        buffer = await this.exportService.generateExcel(
          reportName,
          columns,
          rows,
        );
        const date = new Date().toISOString().split('T')[0];
        filename = `report-${date}.xlsx`;
        contentType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }

      // Send email with attachment
      await this.mailService.sendTemplateEmail(
        email,
        `Your ${reportName} report is ready`,
        'export-ready',
        {
          reportName,
          format,
          rowCount: rows.length,
        },
        {
          filename,
          content: buffer,
          contentType,
        },
      );

      this.logger.log(`Export job #${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Export job #${job.id} failed: ${error.message}`);
      throw error;
    }
  }
}
