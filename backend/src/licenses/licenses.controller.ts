import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LicensesService } from './licenses.service';

@ApiTags('licenses')
@Controller('licenses')
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Get()
  @ApiOperation({ summary: 'List software licenses (redacts license keys)' })
  findAll() {
    return this.licensesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a software license' })
  create(@Body() dto: any) {
    return this.licensesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get license details' })
  findOne(@Param('id') id: string) {
    return this.licensesService.findById(id);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign a license seat' })
  assign(@Param('id') id: string, @Body('assigneeId') assigneeId: string) {
    return this.licensesService.assign(id, assigneeId);
  }
}
