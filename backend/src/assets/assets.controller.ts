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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
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
@ApiBearerAuth('JWT-auth')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'List all assets (paginated, filterable)' })
  @ApiResponse({ status: 200, description: 'Paginated list of assets' })
  findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('locationId') locationId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.assetsService.findAll({
      search,
      categoryId,
      departmentId,
      locationId,
      status,
      page,
      limit,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create an asset' })
  @ApiResponse({ status: 201, description: 'Asset created' })
  create(@Body() dto: any) {
    return this.assetsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset details' })
  @ApiResponse({ status: 200, description: 'Asset details' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  findOne(@Param('id') id: string) {
    return this.assetsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an asset' })
  @ApiResponse({ status: 200, description: 'Asset updated' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.assetsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete an asset' })
  @ApiResponse({ status: 200, description: 'Asset deleted' })
  delete(@Param('id') id: string) {
    return this.assetsService.delete(id);
  }

  @Patch('bulk/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Bulk update asset status' })
  @ApiResponse({ status: 200, description: 'Bulk status update result' })
  bulkStatus(@Body() dto: BulkStatusDto, @GetUser() user: User) {
    return this.assetsService.bulkStatus(dto, user.id);
  }

  @Patch('bulk/assign')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Bulk assign assets to user or department' })
  @ApiResponse({ status: 200, description: 'Bulk assignment result' })
  bulkAssign(@Body() dto: BulkAssignDto, @GetUser() user: User) {
    return this.assetsService.bulkAssign(dto, user.id);
  }

  @Delete('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk soft delete assets (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Bulk delete result' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN role' })
  bulkDelete(@Body() dto: BulkDeleteDto, @GetUser() user: User) {
    return this.assetsService.bulkDelete(dto, user.id);
  }
}
