import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../assets/asset.entity';
import * as ExcelJS from 'exceljs';
import * as PDFKit from 'pdfkit';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  async generateExcelReport(): Promise<Buffer> {
    const assets = await this.assetRepository.find({
      relations: ['category', 'department'],
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Assets Report');

    worksheet.columns = [
      { header: 'Asset ID', key: 'assetId', width: 20 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Condition', key: 'condition', width: 15 },
      { header: 'Purchase Price', key: 'purchasePrice', width: 15 },
      { header: 'Location', key: 'location', width: 25 },
      { header: 'Created Date', key: 'createdAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' },
    };

    assets.forEach((asset) => {
      worksheet.addRow({
        assetId: asset.assetId || '',
        name: asset.name,
        category: (asset as any).category?.name || '',
        department: (asset as any).department?.name || '',
        status: asset.status,
        condition: asset.condition || '',
        purchasePrice: asset.purchasePrice || 0,
        location: asset.location || '',
        createdAt: asset.createdAt.toISOString().split('T')[0],
      });
    });

    worksheet.columns.forEach((column) => {
      column.alignment = { vertical: 'middle', horizontal: 'left' };
    });

    const buffer = await workbook.xlsx.writeBuffer() as unknown as Buffer;
    return buffer;
  }

  async generatePdfReport(): Promise<Buffer> {
    const assets = await this.assetRepository.find({
      relations: ['category', 'department'],
    });

    return new Promise((resolve) => {
      const doc = new PDFKit();
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      doc.fontSize(20).text('Assets Report', { align: 'center' });
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown();

      const headers = [
        'Asset ID',
        'Name',
        'Category',
        'Department',
        'Status',
        'Condition',
        'Purchase Price',
        'Location',
        'Created Date',
      ];

      const columnWidths = [60, 80, 60, 60, 40, 40, 50, 70, 50];
      let yPosition = 150;

      doc.fontSize(10).font('Helvetica-Bold');
      headers.forEach((header, index) => {
        doc.text(header, 50 + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), yPosition, {
          width: columnWidths[index],
        });
      });

      yPosition += 20;
      doc.font('Helvetica');

      assets.forEach((asset) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        const row = [
          asset.assetId || '',
          asset.name,
          (asset as any).category?.name || '',
          (asset as any).department?.name || '',
          asset.status,
          asset.condition || '',
          asset.purchasePrice ? `$${asset.purchasePrice.toFixed(2)}` : '',
          asset.location || '',
          asset.createdAt.toISOString().split('T')[0],
        ];

        row.forEach((cell, index) => {
          doc.text(cell, 50 + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), yPosition, {
            width: columnWidths[index],
          });
        });

        yPosition += 15;
      });

      doc.end();
    });
  }

  async getSummary() {
    const total = await this.assetRepository.count();

    const byStatus = await this.assetRepository
      .createQueryBuilder('asset')
      .select('asset.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('asset.status')
      .getRawMany();

    const byCategory = await this.assetRepository
      .createQueryBuilder('asset')
      .leftJoin('asset.category', 'category')
      .select('category.name', 'name')
      .addSelect('COUNT(*)', 'count')
      .where('category.name IS NOT NULL')
      .groupBy('category.name')
      .orderBy('count', 'DESC')
      .getRawMany();

    const byDepartment = await this.assetRepository
      .createQueryBuilder('asset')
      .leftJoin('asset.department', 'department')
      .select('department.name', 'name')
      .addSelect('COUNT(*)', 'count')
      .where('department.name IS NOT NULL')
      .groupBy('department.name')
      .orderBy('count', 'DESC')
      .getRawMany();

    const recent = await this.assetRepository.find({
      relations: ['category', 'department'],
      order: { createdAt: 'DESC' },
      take: 5,
      select: ['id', 'name', 'createdAt'],
    });

    return {
      total,
      byStatus: byStatus.map(item => ({ status: item.status, count: parseInt(item.count) })),
      byCategory: byCategory.map(item => ({ name: item.name, count: parseInt(item.count) })),
      byDepartment: byDepartment.map(item => ({ name: item.name, count: parseInt(item.count) })),
      recent: recent.map(asset => ({
        id: asset.id,
        name: asset.name,
        category: asset.category?.name || null,
        department: asset.department?.name || null,
      })),
    };
  }
}
