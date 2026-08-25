import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { DepreciationService } from './depreciation.service';

@ApiTags('depreciation')
@ApiBearerAuth('JWT-auth')
@Controller()
export class DepreciationController {
  constructor(private readonly depreciationService: DepreciationService) {}

  @Get('assets/:id/depreciation')
  @ApiOperation({ summary: 'Get depreciation schedule and book value for an asset' })
  @ApiResponse({ status: 200, description: 'Asset depreciation details' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  getAssetDepreciation(@Param('id') id: string) {
    return this.depreciationService.getAssetDepreciation(id);
  }

  @Get('reports/depreciation')
  @ApiOperation({ summary: 'Get org-wide depreciation report' })
  @ApiResponse({ status: 200, description: 'Depreciation report' })
  getDepreciationReport() {
    return this.depreciationService.getDepreciationReport();
  }
}
