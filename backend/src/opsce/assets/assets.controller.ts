import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssetsService } from './assets.service';
import { FilterAssetsDto } from './dto/filter-assets.dto';

@Controller('assets')
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  async findAll(
    @Query() filter: FilterAssetsDto,
    @Query('page') page = '1',
    @Query('perPage') perPage = '20',
  ) {
    const pageNumber = parseInt(page, 10) || 1;
    const perPageNumber = parseInt(perPage, 10) || 20;
    return this.assetsService.findAll(filter, pageNumber, perPageNumber);
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
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Assets')
@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new asset (ADMIN only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Asset successfully created',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  create(@Body() createAssetDto: CreateAssetDto) {
    return this.assetsService.create(createAssetDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all assets with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return paginated assets',
  })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.assetsService.findAll(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an asset by ID' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return the asset',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset not found',
  })
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an asset (ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Asset successfully updated',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset not found',
  })
  update(@Param('id') id: string, @Body() updateAssetDto: UpdateAssetDto) {
    return this.assetsService.update(id, updateAssetDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete an asset (ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Asset successfully deleted',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset not found',
  })
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }
}
