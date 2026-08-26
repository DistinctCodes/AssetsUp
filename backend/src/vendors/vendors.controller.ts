import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('vendors')
@ApiBearerAuth('JWT-auth')
@Controller('vendors')
@UseGuards(JwtAuthGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @ApiOperation({ summary: 'List all vendors/suppliers' })
  @ApiResponse({ status: 200, description: 'List of vendors' })
  findAll() {
    return this.vendorsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a vendor' })
  @ApiResponse({ status: 201, description: 'Vendor created' })
  create(@Body() dto: any) {
    return this.vendorsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor details' })
  @ApiResponse({ status: 200, description: 'Vendor details' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  findOne(@Param('id') id: string) {
    return this.vendorsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a vendor' })
  @ApiResponse({ status: 200, description: 'Vendor updated' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.vendorsService.update(id, dto);
  }
}
