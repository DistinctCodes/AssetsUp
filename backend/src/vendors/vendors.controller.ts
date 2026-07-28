import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';

@ApiTags('vendors')
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @ApiOperation({ summary: 'List all vendors/suppliers' })
  findAll() {
    return this.vendorsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a vendor' })
  create(@Body() dto: any) {
    return this.vendorsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor details' })
  findOne(@Param('id') id: string) {
    return this.vendorsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a vendor' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.vendorsService.update(id, dto);
  }
}
