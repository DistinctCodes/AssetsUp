import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Locations')
@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new location (ADMIN only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Location successfully created',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin role required',
  })
  create(@Body() createLocationDto: CreateLocationDto) {
    return this.locationsService.create(createLocationDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all locations as a flat list with childCount',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by location type',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return all locations',
  })
  findAll(@Query('type') type?: string) {
    return this.locationsService.findAll(type);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a location by ID with children and asset count',
  })
  @ApiParam({ name: 'id', description: 'Location ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return the location',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Location not found',
  })
  findOne(@Param('id') id: string) {
    return this.locationsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a location (ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Location ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location successfully updated',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Location not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin role required',
  })
  update(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.locationsService.update(id, updateLocationDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a location (ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Location ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Location successfully deleted',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Location has active assets',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Location not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin role required',
  })
  remove(@Param('id') id: string) {
    return this.locationsService.remove(id);
  }
}
