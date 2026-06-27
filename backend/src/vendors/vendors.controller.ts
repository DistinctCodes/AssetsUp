import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dtos/create-vendor.dto';
import { UpdateVendorDto } from './dtos/update-vendor.dto';

@Controller('vendors')
@UseGuards(AuthGuard('jwt'))
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  async create(@Body() dto: CreateVendorDto) {
    return this.vendorsService.create(dto);
  }

  @Get()
  async findAll(@Query() query: { page?: number; limit?: number; isActive?: boolean; search?: string }) {
    return this.vendorsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.vendorsService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateVendorDto) {
    return this.vendorsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.vendorsService.remove(id);
    return { message: 'Vendor deleted successfully' };
  }
}
