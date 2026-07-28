import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';

@ApiTags('maintenance')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  @ApiOperation({ summary: 'List all maintenance records' })
  findAll() {
    return this.maintenanceService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a maintenance record' })
  create(@Body() dto: any) {
    return this.maintenanceService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get maintenance record details' })
  findOne(@Param('id') id: string) {
    return this.maintenanceService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a maintenance record' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.maintenanceService.update(id, dto);
  }
}
