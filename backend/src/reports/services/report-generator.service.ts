// src/reports/services/report-generator.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Asset } from '../../assets/entities/asset.entity';
import { Report } from '../entities/report.entity';
import { CsvExportService } from './csv-export.service';
import { JsonExportService } from './json-export.service';
import { ExcelExportService } from './excel-export.service';
import { PdfExportService } from './pdf-export.service';
import { ReportFormat } from '../entities/scheduled-report.entity';

@Injectable()
export class ReportGeneratorService {
  constructor(
    @InjectRepository(Asset)
    private assetRepository: Repository<Asset>,
    private csvExportService: CsvExportService,
    private jsonExportService: JsonExportService,
    private excelExportService: ExcelExportService,
    private pdfExportService: PdfExportService,
  ) {}

  async executeReport(
    report: Report,
    format: ReportFormat,
    parameters?: Record<string, any>,
  ): Promise<{ data: any[]; buffer: Buffer; mimeType: string }> {
    // Build query based on report configuration
    const data = await this.buildAndExecuteQuery(report, parameters);

    // Generate file based on format
    let buffer: Buffer;
    let mimeType: string;

    switch (format) {
      case ReportFormat.CSV:
        buffer = await this.csvExportService.generate(
          data,
          report.configuration.fields,
        );
        mimeType = 'text/csv';
        break;

      case ReportFormat.JSON:
        buffer = await this.jsonExportService.generate(data);
        mimeType = 'application/json';
        break;

      case ReportFormat.EXCEL:
        buffer = await this.excelExportService.generate(
          data,
          report.name,
          report.configuration,
        );
        mimeType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;

      case ReportFormat.PDF:
        buffer = await this.pdfExportService.generate(
          data,
          report.name,
          report.configuration,
        );
        mimeType = 'application/pdf';
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return { data, buffer, mimeType };
  }

  private async buildAndExecuteQuery(
    report: Report,
    parameters?: Record<string, any>,
  ): Promise<any[]> {
    const { fields, filters, groupBy, aggregations, sorting, limit } =
      report.configuration;

    // Use predefined template if available
    if (report.type === 'PREDEFINED' && report.template) {
      return this.executePredefinedReport(report.template, parameters);
    }

    // Build custom query
    let query: SelectQueryBuilder<Asset> =
      this.assetRepository.createQueryBuilder('asset');

    // Add relations
    query = query
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.department', 'department')
      .leftJoinAndSelect('asset.assignedTo', 'assignedTo');

    // Apply filters
    if (filters) {
      this.applyFilters(query, filters, parameters);
    }

    // Select fields
    if (fields && fields.length > 0) {
      const selectFields = fields.map((field) => {
        if (field.includes('.')) {
          return field;
        }
        return `asset.${field}`;
      });
      query = query.select(selectFields);
    }

    // Apply aggregations
    if (aggregations && aggregations.length > 0) {
      aggregations.forEach((agg) => {
        const aggFunction = agg.operation.toUpperCase();
        query = query.addSelect(
          `${aggFunction}(asset.${agg.field})`,
          agg.alias,
        );
      });
    }

    // Apply grouping
    if (groupBy) {
      query = query.groupBy(`asset.${groupBy}`);
    }

    // Apply sorting
    if (sorting && sorting.length > 0) {
      sorting.forEach((sort, index) => {
        const field = sort.field.includes('.')
          ? sort.field
          : `asset.${sort.field}`;
        if (index === 0) {
          query = query.orderBy(field, sort.order);
        } else {
          query = query.addOrderBy(field, sort.order);
        }
      });
    }

    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }

    return await query.getRawMany();
  }

  private applyFilters(
    query: SelectQueryBuilder<Asset>,
    filters: Record<string, any>,
    parameters?: Record<string, any>,
  ): void {
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        query.andWhere(`asset.${key} IN (:...${key})`, { [key]: value });
      } else if (typeof value === 'object') {
        // Handle range filters (gte, lte, gt, lt)
        if (value.gte !== undefined) {
          query.andWhere(`asset.${key} >= :${key}_gte`, {
            [`${key}_gte`]: value.gte,
          });
        }
        if (value.lte !== undefined) {
          query.andWhere(`asset.${key} <= :${key}_lte`, {
            [`${key}_lte`]: value.lte,
          });
        }
        if (value.gt !== undefined) {
          query.andWhere(`asset.${key} > :${key}_gt`, {
            [`${key}_gt`]: value.gt,
          });
        }
        if (value.lt !== undefined) {
          query.andWhere(`asset.${key} < :${key}_lt`, {
            [`${key}_lt`]: value.lt,
          });
        }
      } else {
        query.andWhere(`asset.${key} = :${key}`, { [key]: value });
      }
    });

    // Apply runtime parameters
    if (parameters) {
      Object.entries(parameters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.andWhere(`asset.${key} = :param_${key}`, {
            [`param_${key}`]: value,
          });
        }
      });
    }
  }

  private async executePredefinedReport(
    template: string,
    parameters?: Record<string, any>,
  ): Promise<any[]> {
    // Implement predefined report templates
    switch (template) {
      case 'ASSET_INVENTORY':
        return this.assetInventoryReport(parameters);
      case 'ASSET_VALUE':
        return this.assetValueReport(parameters);
      case 'DEPRECIATION':
        return this.depreciationReport(parameters);
      case 'ASSET_UTILIZATION':
        return this.assetUtilizationReport(parameters);
      case 'WARRANTY_EXPIRATION':
        return this.warrantyExpirationReport(parameters);
      default:
        throw new NotFoundException(`Template ${template} not found`);
    }
  }

  private async assetInventoryReport(
    parameters?: Record<string, any>,
  ): Promise<any[]> {
    return this.assetRepository
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.department', 'department')
      .leftJoinAndSelect('asset.assignedTo', 'assignedTo')
      .select([
        'asset.id',
        'asset.name',
        'asset.assetTag',
        'asset.serialNumber',
        'category.name',
        'department.name',
        'asset.status',
        'asset.purchasePrice',
        'asset.purchaseDate',
        'assignedTo.name',
      ])
      .getRawMany();
  }

  private async assetValueReport(
    parameters?: Record<string, any>,
  ): Promise<any[]> {
    return this.assetRepository
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.department', 'department')
      .leftJoinAndSelect('asset.category', 'category')
      .select('department.name', 'department')
      .addSelect('category.name', 'category')
      .addSelect('COUNT(asset.id)', 'assetCount')
      .addSelect('SUM(asset.purchasePrice)', 'totalValue')
      .groupBy('department.name')
      .addGroupBy('category.name')
      .getRawMany();
  }

  private async depreciationReport(
    parameters?: Record<string, any>,
  ): Promise<any[]> {
    // Implement depreciation calculation logic
    return this.assetRepository
      .createQueryBuilder('asset')
      .select([
        'asset.id',
        'asset.name',
        'asset.purchasePrice',
        'asset.purchaseDate',
        'asset.depreciationRate',
      ])
      .getRawMany();
  }

  private async assetUtilizationReport(
    parameters?: Record<string, any>,
  ): Promise<any[]> {
    return this.assetRepository
      .createQueryBuilder('asset')
      .select('asset.status', 'status')
      .addSelect('COUNT(asset.id)', 'count')
      .groupBy('asset.status')
      .getRawMany();
  }

  private async warrantyExpirationReport(
    parameters?: Record<string, any>,
  ): Promise<any[]> {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return this.assetRepository
      .createQueryBuilder('asset')
      .where('asset.warrantyExpiryDate <= :expiryDate', {
        expiryDate: thirtyDaysFromNow,
      })
      .andWhere('asset.warrantyExpiryDate >= :today', { today: new Date() })
      .select([
        'asset.id',
        'asset.name',
        'asset.warrantyExpiryDate',
        'asset.purchaseDate',
      ])
      .getRawMany();
  }
}