import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../assets/asset.entity';
import { AssetCondition, AssetStatus } from '../assets/enums';
import { Maintenance, MaintenanceStatus } from '../assets/maintenance.entity';
import { AssetFiltersDto } from '../assets/dto/asset-filters.dto';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetsRepo: Repository<Asset>,
    @InjectRepository(Maintenance)
    private readonly maintenanceRepo: Repository<Maintenance>,
  ) {}

  async getSummary() {
    const [summaryRow, statusRows, byCategory, byDepartment, recent, maintenanceDueRow] =
      await Promise.all([
        this.assetsRepo
          .createQueryBuilder('a')
          .select('COUNT(*)', 'total')
          .addSelect('COALESCE(SUM(a.purchasePrice), 0)', 'totalValue')
          .addSelect(
            "COALESCE(AVG(DATE_PART('day', CURRENT_DATE - a.purchaseDate)), 0)",
            'averageAgeInDays',
          )
          .addSelect(
            "SUM(CASE WHEN a.warrantyExpiration BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END)",
            'warrantyExpiringCount',
          )
          .getRawOne<{
            total: string;
            totalValue: string;
            averageAgeInDays: string;
            warrantyExpiringCount: string;
          }>(),
        this.assetsRepo
          .createQueryBuilder('a')
          .select('a.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .groupBy('a.status')
          .getRawMany<{ status: string; count: string }>(),
        this.assetsRepo
          .createQueryBuilder('a')
          .leftJoin('a.category', 'c')
          .select('COALESCE(c.name, :uncategorised)', 'name')
          .setParameter('uncategorised', 'Uncategorised')
          .addSelect('COUNT(*)', 'count')
          .groupBy('c.name')
          .getRawMany<{ name: string; count: string }>()
          .then((rows) => rows.map((r) => ({ name: r.name, count: Number(r.count) }))),
        this.assetsRepo
          .createQueryBuilder('a')
          .leftJoin('a.department', 'd')
          .select('COALESCE(d.name, :unassigned)', 'name')
          .setParameter('unassigned', 'Unassigned')
          .addSelect('COUNT(*)', 'count')
          .groupBy('d.name')
          .getRawMany<{ name: string; count: string }>()
          .then((rows) => rows.map((r) => ({ name: r.name, count: Number(r.count) }))),
        this.assetsRepo
          .createQueryBuilder('a')
          .leftJoinAndSelect('a.category', 'c')
          .leftJoinAndSelect('a.department', 'd')
          .orderBy('a.createdAt', 'DESC')
          .take(5)
          .getMany(),
        this.maintenanceRepo
          .createQueryBuilder('m')
          .select('COUNT(*)', 'maintenanceDueCount')
          .where('m.status = :status', { status: MaintenanceStatus.SCHEDULED })
          .andWhere(
            "m.scheduledDate BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'",
          )
          .getRawOne<{ maintenanceDueCount: string }>(),
      ]);

    const byStatus = Object.values(AssetStatus).reduce(
      (acc, s) => {
        acc[s] = 0;
        return acc;
      },
      {} as Record<AssetStatus, number>,
    );

    for (const { status, count } of statusRows) {
      byStatus[status as AssetStatus] = Number(count);
    }

    return {
      total: Number(summaryRow?.total ?? 0),
      totalValue: Number(summaryRow?.totalValue ?? 0),
      averageAgeInDays: Number(summaryRow?.averageAgeInDays ?? 0),
      maintenanceDueCount: Number(maintenanceDueRow?.maintenanceDueCount ?? 0),
      warrantyExpiringCount: Number(summaryRow?.warrantyExpiringCount ?? 0),
      byStatus,
      byCategory,
      byDepartment,
      recent,
    };
  }

  async getByDepartment() {
    const rows = await this.assetsRepo
      .createQueryBuilder('a')
      .leftJoin('a.department', 'd')
      .select('COALESCE(d.name, :unassigned)', 'departmentName')
      .setParameter('unassigned', 'Unassigned')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(a.purchasePrice), 0)', 'totalValue')
      .addSelect(
        'SUM(CASE WHEN a.status = :active THEN 1 ELSE 0 END)',
        'activeCount',
      )
      .addSelect(
        'SUM(CASE WHEN a.status = :assigned THEN 1 ELSE 0 END)',
        'assignedCount',
      )
      .addSelect(
        'SUM(CASE WHEN a.status = :maintenance THEN 1 ELSE 0 END)',
        'maintenanceCount',
      )
      .addSelect(
        'SUM(CASE WHEN a.status = :retired THEN 1 ELSE 0 END)',
        'retiredCount',
      )
      .setParameters({
        active: AssetStatus.ACTIVE,
        assigned: AssetStatus.ASSIGNED,
        maintenance: AssetStatus.MAINTENANCE,
        retired: AssetStatus.RETIRED,
      })
      .groupBy('d.name')
      .getRawMany<{
        departmentName: string;
        count: string;
        totalValue: string;
        activeCount: string;
        assignedCount: string;
        maintenanceCount: string;
        retiredCount: string;
      }>();

    return rows.map((row) => ({
      departmentName: row.departmentName,
      total: Number(row.count),
      totalValue: Number(row.totalValue),
      byStatus: {
        [AssetStatus.ACTIVE]: Number(row.activeCount),
        [AssetStatus.ASSIGNED]: Number(row.assignedCount),
        [AssetStatus.MAINTENANCE]: Number(row.maintenanceCount),
        [AssetStatus.RETIRED]: Number(row.retiredCount),
      },
    }));
  }

  async getByCategory() {
    const rows = await this.assetsRepo
      .createQueryBuilder('a')
      .leftJoin('a.category', 'c')
      .select('COALESCE(c.name, :uncategorised)', 'categoryName')
      .setParameter('uncategorised', 'Uncategorised')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(a.purchasePrice), 0)', 'totalValue')
      .addSelect('SUM(CASE WHEN a.condition = :newCondition THEN 1 ELSE 0 END)', 'newCount')
      .addSelect('SUM(CASE WHEN a.condition = :goodCondition THEN 1 ELSE 0 END)', 'goodCount')
      .addSelect('SUM(CASE WHEN a.condition = :fairCondition THEN 1 ELSE 0 END)', 'fairCount')
      .addSelect('SUM(CASE WHEN a.condition = :poorCondition THEN 1 ELSE 0 END)', 'poorCount')
      .addSelect(
        'SUM(CASE WHEN a.condition = :damagedCondition THEN 1 ELSE 0 END)',
        'damagedCount',
      )
      .setParameters({
        newCondition: AssetCondition.NEW,
        goodCondition: AssetCondition.GOOD,
        fairCondition: AssetCondition.FAIR,
        poorCondition: AssetCondition.POOR,
        damagedCondition: AssetCondition.DAMAGED,
      })
      .groupBy('c.name')
      .getRawMany<{
        categoryName: string;
        count: string;
        totalValue: string;
        newCount: string;
        goodCount: string;
        fairCount: string;
        poorCount: string;
        damagedCount: string;
      }>();

    return rows.map((row) => ({
      categoryName: row.categoryName,
      total: Number(row.count),
      totalValue: Number(row.totalValue),
      byCondition: {
        [AssetCondition.NEW]: Number(row.newCount),
        [AssetCondition.GOOD]: Number(row.goodCount),
        [AssetCondition.FAIR]: Number(row.fairCount),
        [AssetCondition.POOR]: Number(row.poorCount),
        [AssetCondition.DAMAGED]: Number(row.damagedCount),
      },
    }));
  }

  async getMaintenanceHistory(from?: string, to?: string) {
    const qb = this.maintenanceRepo
      .createQueryBuilder('m')
      .leftJoin(Asset, 'a', 'a.id = m.assetId')
      .select('m.id', 'id')
      .addSelect('a.name', 'assetName')
      .addSelect('m.type', 'type')
      .addSelect('m.cost', 'cost')
      .addSelect('m.status', 'status')
      .addSelect('m.scheduledDate', 'scheduledDate')
      .addSelect('m.completedDate', 'completedDate')
      .orderBy('m.scheduledDate', 'DESC');

    if (from) {
      qb.andWhere('m.scheduledDate >= :from', { from });
    }
    if (to) {
      qb.andWhere('m.scheduledDate <= :to', { to });
    }

    const rows = await qb.getRawMany<{
      id: string;
      assetName: string;
      type: string;
      cost: string | null;
      status: string;
      scheduledDate: string;
      completedDate: string | null;
    }>();

    return rows.map((row) => ({
      id: row.id,
      assetName: row.assetName,
      type: row.type,
      cost: row.cost === null ? null : Number(row.cost),
      status: row.status,
      scheduledDate: row.scheduledDate,
      completedDate: row.completedDate,
    }));
  }

  async exportAssets(filters: AssetFiltersDto): Promise<Asset[]> {
    const { search, status, condition, categoryId, departmentId } = filters;
    const qb = this.assetsRepo
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.department', 'department')
      .leftJoinAndSelect('asset.assignedTo', 'assignedTo')
      .leftJoinAndSelect('asset.createdBy', 'createdBy')
      .leftJoinAndSelect('asset.updatedBy', 'updatedBy');

    if (search) {
      qb.andWhere(
        '(asset.name ILIKE :search OR asset.assetId ILIKE :search OR asset.serialNumber ILIKE :search OR asset.manufacturer ILIKE :search OR asset.model ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (status) qb.andWhere('asset.status = :status', { status });
    if (condition) qb.andWhere('asset.condition = :condition', { condition });
    if (categoryId) qb.andWhere('category.id = :categoryId', { categoryId });
    if (departmentId) qb.andWhere('department.id = :departmentId', { departmentId });

    qb.orderBy('asset.createdAt', 'DESC');

    return qb.getMany();
  }

  async exportToExcel(filters: AssetFiltersDto): Promise<Readable> {
    const assets = await this.exportAssets(filters);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AssetsUp';
    workbook.lastModifiedBy = 'AssetsUp System';
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet('Assets');

    // Define columns
    worksheet.columns = [
      { header: 'Asset ID', key: 'assetId', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Condition', key: 'condition', width: 15 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Assigned To', key: 'assignedTo', width: 25 },
      { header: 'Purchase Date', key: 'purchaseDate', width: 15 },
      { header: 'Purchase Price', key: 'purchasePrice', width: 15 },
      { header: 'Serial Number', key: 'serialNumber', width: 20 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

    // Add data rows with alternate shading
    assets.forEach((asset, index) => {
      const row = worksheet.addRow({
        assetId: asset.assetId,
        name: asset.name,
        category: asset.category?.name || 'Uncategorized',
        department: asset.department?.name || 'Unassigned',
        status: asset.status,
        condition: asset.condition,
        location: asset.location || 'N/A',
        assignedTo: asset.assignedTo 
          ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}`.trim()
          : 'Unassigned',
        purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : 'N/A',
        purchasePrice: asset.purchasePrice ? `₮${asset.purchasePrice}` : '₮0',
        serialNumber: asset.serialNumber || 'N/A',
      });

      // Alternate row shading (light gray for even rows)
      if ((index + 1) % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF5F5F5' },
          };
        });
      }
    });

    // Enable auto-filter on header row
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 11 },
    };

    // Auto-size columns based on content
    worksheet.columns.forEach((column) => {
      if (column.key) {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(Math.max(maxLength + 2, 10), 50);
      }
    });

    // Convert workbook to stream
    const stream = new Readable();
    const buffer = await workbook.xlsx.writeBuffer();
    stream.push(buffer);
    stream.push(null);
    
    return stream;
  }

  async exportToPdf(filters: AssetFiltersDto): Promise<Readable> {
    const assets = await this.exportAssets(filters);

    // Create a PassThrough stream for pdfkit
    const doc = new PDFDocument({ margin: 40 });
    const stream = new Readable();
    
    // Pipe pdf document to our stream
    doc.pipe(stream as any);

    // Title
    doc.fontSize(20).text('Assets Report', { align: 'center' });
    doc.moveDown(0.5);

    // Generated date
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'left' });
    doc.moveDown(0.5);

    // Filter summary
    doc.fontSize(12).text('Applied Filters:', { underline: true });
    const filterParts: string[] = [];
    if (filters.search) filterParts.push(`Search: "${filters.search}"`);
    if (filters.status) filterParts.push(`Status: ${filters.status}`);
    if (filters.condition) filterParts.push(`Condition: ${filters.condition}`);
    if (filters.categoryId) filterParts.push(`Category ID: ${filters.categoryId}`);
    if (filters.departmentId) filterParts.push(`Department ID: ${filters.departmentId}`);
    
    if (filterParts.length > 0) {
      doc.fontSize(10).text(filterParts.join(' | '), { align: 'left' });
    } else {
      doc.fontSize(10).text('None - showing all assets', { align: 'left' });
    }
    doc.moveDown(0.5);

    // Total count
    doc.fontSize(12).text(`Total Assets: ${assets.length}`, { align: 'right' });
    doc.moveDown(1);

    // Table headers
    const tableTop = doc.y;
    const tableLeft = 40;
    const colWidths = [60, 120, 80, 80, 70, 90];
    const rowHeight = 20;
    
    // Header row background
    doc.rect(tableLeft, tableTop - 5, colWidths.reduce((a, b) => a + b, 0), rowHeight + 5)
       .fill('#E0E0E0');
    
    // Headers
    doc.fontSize(10).font('Helvetica-Bold');
    const headers = ['Asset ID', 'Name', 'Category', 'Department', 'Status', 'Location'];
    let x = tableLeft + 5;
    headers.forEach((header, i) => {
      doc.text(header, x, tableTop, { width: colWidths[i] - 10, align: 'left' });
      x += colWidths[i];
    });
    
    // Draw header borders
    doc.lineWidth(1);
    doc.moveTo(tableLeft, tableTop - 5)
       .lineTo(tableLeft + colWidths.reduce((a, b) => a + b, 0), tableTop - 5)
       .stroke();
    doc.moveTo(tableLeft, tableTop + rowHeight)
       .lineTo(tableLeft + colWidths.reduce((a, b) => a + b, 0), tableTop + rowHeight)
       .stroke();

    // Data rows
    doc.font('Helvetica');
    let y = tableTop + rowHeight + 5;
    
    assets.forEach((asset, index) => {
      // Check if we need a new page
      if (y + rowHeight > doc.page.height - 60) {
        // Add page number to current page
        const pageCount = doc.bufferedPageRange().count;
        doc.fontSize(8).fill('#666')
           .text(
             `Page ${pageCount}`,
             doc.page.width - 100,
             doc.page.height - 30,
             { align: 'right' }
           );
        
        // Add new page
        doc.addPage();
        y = 60; // Reset y position for new page
        
        // Re-draw headers on new page
        doc.rect(tableLeft, y - 5, colWidths.reduce((a, b) => a + b, 0), rowHeight + 5)
           .fill('#E0E0E0');
        doc.fontSize(10).font('Helvetica-Bold');
        x = tableLeft + 5;
        headers.forEach((header, i) => {
          doc.text(header, x, y, { width: colWidths[i] - 10, align: 'left' });
          x += colWidths[i];
        });
        doc.moveTo(tableLeft, y - 5)
           .lineTo(tableLeft + colWidths.reduce((a, b) => a + b, 0), y - 5)
           .stroke();
        doc.moveTo(tableLeft, y + rowHeight)
           .lineTo(tableLeft + colWidths.reduce((a, b) => a + b, 0), y + rowHeight)
           .stroke();
        y += rowHeight + 5;
        doc.font('Helvetica');
      }

      // Alternate row shading
      if ((index + 1) % 2 === 0) {
        doc.rect(tableLeft, y, colWidths.reduce((a, b) => a + b, 0), rowHeight)
           .fill('#F5F5F5');
      }

      // Row data
      doc.fontSize(9).fill('#000');
      x = tableLeft + 5;
      const rowData = [
        asset.assetId,
        asset.name.length > 25 ? asset.name.substring(0, 25) + '...' : asset.name,
        asset.category?.name || 'Uncategorized',
        asset.department?.name || 'Unassigned',
        asset.status,
        asset.location || 'N/A',
      ];
      
      rowData.forEach((data, i) => {
        doc.text(data.toString(), x, y + 3, { width: colWidths[i] - 10, align: 'left' });
        x += colWidths[i];
      });

      // Draw row border
      doc.moveTo(tableLeft, y)
         .lineTo(tableLeft + colWidths.reduce((a, b) => a + b, 0), y)
         .stroke();

      y += rowHeight;
    });

    // Final page number
    const pageCount = doc.bufferedPageRange().count;
    doc.fontSize(8).fill('#666')
       .text(
         `Page ${pageCount}`,
         doc.page.width - 100,
         doc.page.height - 30,
         { align: 'right' }
       );

    doc.end();
    
    return stream;
  }
}
