import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { LicensesService } from './licenses.service';

@ApiTags('licenses')
@ApiBearerAuth('JWT-auth')
@Controller('licenses')
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Get()
  @ApiOperation({ summary: 'List software licenses (redacts license keys)' })
  @ApiResponse({ status: 200, description: 'List of licenses' })
  findAll() {
    return this.licensesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a software license' })
  @ApiResponse({ status: 201, description: 'License created' })
  create(@Body() dto: any) {
    return this.licensesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get license details' })
  @ApiResponse({ status: 200, description: 'License details' })
  @ApiResponse({ status: 404, description: 'License not found' })
  findOne(@Param('id') id: string) {
    return this.licensesService.findById(id);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign a license seat' })
  @ApiResponse({ status: 201, description: 'License seat assigned' })
  assign(@Param('id') id: string, @Body('assigneeId') assigneeId: string) {
    return this.licensesService.assign(id, assigneeId);
  }
}
