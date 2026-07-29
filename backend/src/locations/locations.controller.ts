import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all locations with per-node and rolled-up asset counts',
  })
  findAll() {
    return this.locationsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a location' })
  create(@Body() dto: CreateLocationDto) {
    return this.locationsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get location details' })
  findOne(@Param('id') id: string) {
    return this.locationsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update or move a location' })
  update(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.locationsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a location (blocked if children or assets exist)',
  })
  delete(@Param('id') id: string) {
    return this.locationsService.delete(id);
  }
}
