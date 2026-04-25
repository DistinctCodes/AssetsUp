import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetFiltersDto } from './dto/asset-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'List assets with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated assets' })
  async findAll(@Query() filters: AssetFiltersDto) {
    return this.assetsService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single asset by ID with all relations' })
  @ApiResponse({ status: 200, description: 'Returns the asset' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update an asset' })
  @ApiResponse({ status: 200, description: 'Asset updated' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.assetsService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete an asset' })
  @ApiResponse({ status: 204, description: 'Asset soft deleted' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.assetsService.softDelete(id, userId);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted asset' })
  @ApiResponse({ status: 200, description: 'Asset restored' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.assetsService.restore(id, userId);
  }
}
