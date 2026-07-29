import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@ApiBearerAuth('JWT-auth')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all locations' })
  @ApiResponse({ status: 200, description: 'List of locations' })
  findAll() {
    return this.locationsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a location' })
  @ApiResponse({ status: 201, description: 'Location created' })
  create(@Body() dto: any) {
    return this.locationsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get location details' })
  @ApiResponse({ status: 200, description: 'Location details' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  findOne(@Param('id') id: string) {
    return this.locationsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a location' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.locationsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a location' })
  @ApiResponse({ status: 200, description: 'Location deleted' })
  delete(@Param('id') id: string) {
    return this.locationsService.delete(id);
  }
}
