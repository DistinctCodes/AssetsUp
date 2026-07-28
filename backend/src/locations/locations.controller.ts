import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all locations' })
  findAll() {
    return this.locationsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a location' })
  create(@Body() dto: any) {
    return this.locationsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get location details' })
  findOne(@Param('id') id: string) {
    return this.locationsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a location' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.locationsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a location' })
  delete(@Param('id') id: string) {
    return this.locationsService.delete(id);
  }
}
