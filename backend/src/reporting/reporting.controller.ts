import { Controller, Get, Query, Res, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { ReportingService } from './reporting.service';
import { ExportService, ExportColumn } from './export.service';
import { QueueService } from '../queue/queue.service';

@Controller('reports')
@UseGuards(AuthGuard('jwt'))
export class ReportingController {
  constructor(
    private readonly reportingService: ReportingService,
    private readonly exportService: ExportService,
    private readonly queueService: QueueService,
  ) {}

  private async handleExport(
    reportName: string,
    columns: ExportColumn[],
    rows: Record<string, any>[],
    format: string | undefined,
    res: Response,
    req: Request,
  ) {
    // Default to JSON if no format specified
    if (!format || format === 'json') {
      return res.json(rows);
    }

    // For large exports, use background job
    if (rows.length > 1000) {
      const user = (req as any).user;
      const email = user?.email || user?.username;

      if (!email) {
        return res
          .status(400)
          .json({ error: 'Email required for large exports' });
      }

      const job = await this.queueService.queueExport({
        email,
        reportName,
        format: format as 'pdf' | 'xlsx',
        columns,
        rows,
      });

      return res.json({
        jobId: job.jobId,
        message: 'Export queued, will be emailed when ready',
      });
    }

    // For small exports, generate inline
    let buffer: Buffer;
    let filename: string;
    let contentType: string;
    const date = new Date().toISOString().split('T')[0];

    if (format === 'pdf') {
      buffer = await this.exportService.generatePdf(reportName, columns, rows);
      filename = `report-${date}.pdf`;
      contentType = 'application/pdf';
    } else if (format === 'xlsx') {
      buffer = await this.exportService.generateExcel(
        reportName,
        columns,
        rows,
      );
      filename = `report-${date}.xlsx`;
      contentType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      return res.json(rows);
    }

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    return res.send(buffer);
  }

  @Get('summary')
  async getAssetSummary(
    @Query('format') format: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const data = await this.reportingService.getAssetSummary();

    // Convert summary object to array format for export
    const rows = [
      { metric: 'Total Assets', value: data.total },
      { metric: 'Total Value', value: data.totalValue },
      ...Object.entries(data.byStatus).map(([status, count]) => ({
        metric: `Status: ${status}`,
        value: count,
      })),
      ...Object.entries(data.byCondition).map(([condition, count]) => ({
        metric: `Condition: ${condition}`,
        value: count,
      })),
    ];

    const columns: ExportColumn[] = [
      { header: 'Metric', key: 'metric', width: 40 },
      { header: 'Value', key: 'value', width: 20 },
    ];

    return this.handleExport('Asset Summary', columns, rows, format, res, req);
  }

  @Get('asset-summary')
  async getAssetSummaryLegacy(@Res() res: Response) {
    const data = await this.reportingService.getAssetSummary();
    return res.json(data);
  }

  @Get('warranty-expiring')
  async getWarrantyExpiring(
    @Query('format') format: string,
    @Query('days') days: number,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const rows = await this.reportingService.getWarrantyExpiring(days || 90);

    const columns: ExportColumn[] = [
      { header: 'Asset ID', key: 'asset_id', width: 20 },
      { header: 'Name', key: 'asset_name', width: 30 },
      { header: 'Serial Number', key: 'asset_serialNumber', width: 25 },
      {
        header: 'Warranty Expiration',
        key: 'asset_warrantyExpiration',
        width: 25,
      },
      { header: 'Status', key: 'asset_status', width: 15 },
    ];

    return this.handleExport(
      'Warranty Expiring',
      columns,
      rows,
      format,
      res,
      req,
    );
  }

  @Get('maintenance-costs')
  async getMaintenanceCosts(
    @Query('format') format: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const rows = await this.reportingService.getMaintenanceCosts();

    const columns: ExportColumn[] = [
      { header: 'Asset ID', key: 'asset_id', width: 20 },
      { header: 'Name', key: 'asset_name', width: 30 },
      { header: 'Category', key: 'asset_categoryId', width: 20 },
      {
        header: 'Total Maintenance Cost',
        key: 'totalMaintenanceCost',
        width: 25,
      },
      { header: 'Maintenance Count', key: 'maintenanceCount', width: 20 },
    ];

    return this.handleExport(
      'Maintenance Costs',
      columns,
      rows,
      format,
      res,
      req,
    );
  }

  @Get('depreciation')
  async getDepreciation(
    @Query('format') format: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const rows = await this.reportingService.getDepreciationReport();

    const columns: ExportColumn[] = [
      { header: 'Asset ID', key: 'id', width: 20 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Purchase Price', key: 'purchasePrice', width: 20 },
      { header: 'Current Value', key: 'currentValue', width: 20 },
      { header: 'Purchase Date', key: 'purchaseDate', width: 20 },
      { header: 'Age (Years)', key: 'ageInYears', width: 15 },
      { header: 'Total Depreciation', key: 'totalDepreciation', width: 20 },
      { header: 'Annual Depreciation', key: 'annualDepreciation', width: 20 },
    ];

    return this.handleExport(
      'Depreciation Report',
      columns,
      rows,
      format,
      res,
      req,
    );
  }

  @Get('by-department')
  async getDepartmentReport(
    @Query('format') format: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const rows = await this.reportingService.getDepartmentReport();

    const columns: ExportColumn[] = [
      { header: 'Department ID', key: 'departmentId', width: 25 },
      { header: 'Asset Count', key: 'assetCount', width: 15 },
      { header: 'Total Value', key: 'totalValue', width: 20 },
    ];

    return this.handleExport(
      'Department Report',
      columns,
      rows,
      format,
      res,
      req,
    );
  }

  @Get('by-category')
  async getCategoryReport(
    @Query('format') format: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const rows = await this.reportingService.getCategoryReport();

    const columns: ExportColumn[] = [
      { header: 'Category ID', key: 'categoryId', width: 25 },
      { header: 'Asset Count', key: 'assetCount', width: 15 },
      { header: 'Total Value', key: 'totalValue', width: 20 },
    ];

    return this.handleExport(
      'Category Report',
      columns,
      rows,
      format,
      res,
      req,
    );
  }

  @Get('value-over-time')
  async getValueOverTime(
    @Query('format') format: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const rows = await this.reportingService.getValueOverTime();

    const columns: ExportColumn[] = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Total Value', key: 'totalValue', width: 20 },
      { header: 'Asset Count', key: 'assetCount', width: 15 },
    ];

    return this.handleExport(
      'Value Over Time',
      columns,
      rows,
      format,
      res,
      req,
    );
  }
}
