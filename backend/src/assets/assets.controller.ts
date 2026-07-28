import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { BulkStatusDto } from './dto/bulk-status.dto';
import { BulkAssignDto } from './dto/bulk-assign.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'List all assets (paginated, filterable)' })
  findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('locationId') locationId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.assetsService.findAll({ search, categoryId, departmentId, locationId, status, page, limit });
  }

  @Post()
  @ApiOperation({ summary: 'Create an asset' })
  create(@Body() dto: any) {
    return this.assetsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset details' })
  findOne(@Param('id') id: string) {
    return this.assetsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an asset' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.assetsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete an asset' })
  delete(@Param('id') id: string) {
    return this.assetsService.delete(id);
  }

  @Patch('bulk/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update asset status' })
  bulkStatus(@Body() dto: BulkStatusDto, @GetUser() user: User) {
    return this.assetsService.bulkStatus(dto, user.id);
  }

  @Patch('bulk/assign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk assign assets to user or department' })
  bulkAssign(@Body() dto: BulkAssignDto, @GetUser() user: User) {
    return this.assetsService.bulkAssign(dto, user.id);
  }

  @Delete('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk soft delete assets (ADMIN only)' })
  bulkDelete(@Body() dto: BulkDeleteDto, @GetUser() user: User) {
    return this.assetsService.bulkDelete(dto, user.id);
  }
}
