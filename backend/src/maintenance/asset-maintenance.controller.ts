import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('assets')
@ApiBearerAuth('JWT-auth')
@Controller('assets/:id/maintenance')
@UseGuards(JwtAuthGuard)
export class AssetMaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  @ApiOperation({ summary: "Get an asset's maintenance history" })
  findForAsset(@Param('id') assetId: string) {
    return this.maintenanceService.findAll({ assetId });
  }

  @Post()
  @ApiOperation({ summary: 'Schedule maintenance for an asset' })
  create(
    @Param('id') assetId: string,
    @Body() dto: CreateMaintenanceRecordDto,
  ) {
    return this.maintenanceService.create(dto, assetId);
  }

  @Patch(':maintenanceId')
  @ApiOperation({ summary: "Update an asset's maintenance record status" })
  updateStatus(
    @Param('id') assetId: string,
    @Param('maintenanceId') maintenanceId: string,
    @Body() dto: UpdateMaintenanceStatusDto,
  ) {
    return this.maintenanceService.updateStatus(
      maintenanceId,
      dto.status,
      assetId,
    );
  }
}
