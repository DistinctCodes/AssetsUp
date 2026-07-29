import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { UpdateMaintenanceRecordDto } from './dto/update-maintenance-record.dto';

@ApiTags('maintenance')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  @ApiOperation({
    summary: 'List all maintenance records across assets, with filters',
  })
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
  create(@Body() dto: CreateMaintenanceRecordDto) {
    return this.maintenanceService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get maintenance record details' })
  findOne(@Param('id') id: string) {
    return this.maintenanceService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a maintenance record' })
  update(@Param('id') id: string, @Body() dto: UpdateMaintenanceRecordDto) {
    return this.maintenanceService.update(id, dto);
  }
}
