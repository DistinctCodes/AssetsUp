import { Controller, Get, UseGuards, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssetFiltersDto } from '../assets/dto/asset-filters.dto';
import { Response } from 'express';
import { Parser } from 'json2csv';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get asset summary statistics' })
  getSummary() {
    return this.service.getSummary();
  }

  @Get('assets/export/csv')
  @ApiOperation({ summary: 'Export assets filtered list as CSV' })
  async exportAssets(
    @Query() filters: AssetFiltersDto,
    @Res() res: Response,
  ) {
    const assets = await this.service.exportAssets(filters);
    const rows = assets.map((asset) => ({
      'Asset ID': asset.assetId,
      Name: asset.name,
      Category: asset.category?.name ?? '',
      Department: asset.department?.name ?? '',
      Status: asset.status,
      Condition: asset.condition,
      Location: asset.location ?? '',
      'Assigned To': asset.assignedTo
        ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}`
        : '',
      'Purchase Date': asset.purchaseDate
        ? asset.purchaseDate.toISOString().split('T')[0]
        : '',
      'Purchase Price': asset.purchasePrice ?? '',
      'Serial Number': asset.serialNumber ?? '',
    }));

    const parser = new Parser({
      fields: [
        'Asset ID',
        'Name',
        'Category',
        'Department',
        'Status',
        'Condition',
        'Location',
        'Assigned To',
        'Purchase Date',
        'Purchase Price',
        'Serial Number',
      ],
    });

    const csv = parser.parse(rows);
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="assets-export.csv"');
    res.send(csv);
  }
}
