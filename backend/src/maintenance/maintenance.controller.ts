import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { UpdateMaintenanceRecordDto } from './dto/update-maintenance-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('maintenance')
@ApiBearerAuth('JWT-auth')
@Controller('maintenance')
@UseGuards(JwtAuthGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  @ApiOperation({
    summary: 'List all maintenance records across assets, with filters',
  })
  @ApiResponse({ status: 200, description: 'List of maintenance records' })
  findAll(
    @Query('assetId') assetId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('departmentId') departmentId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.maintenanceService.findAll({
      assetId,
      status,
      type,
      departmentId,
      from,
      to,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a maintenance record' })
  @ApiResponse({ status: 201, description: 'Maintenance record created' })
  create(@Body() dto: CreateMaintenanceRecordDto) {
    return this.maintenanceService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get maintenance record details' })
  @ApiResponse({ status: 200, description: 'Maintenance record details' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  findOne(@Param('id') id: string) {
    return this.maintenanceService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a maintenance record' })
  @ApiResponse({ status: 200, description: 'Maintenance record updated' })
  update(@Param('id') id: string, @Body() dto: UpdateMaintenanceRecordDto) {
    return this.maintenanceService.update(id, dto);
  }
}
