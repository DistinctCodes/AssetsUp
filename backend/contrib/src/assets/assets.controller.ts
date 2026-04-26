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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { DuplicateAssetDto } from './dto/duplicate-asset.dto';
import { AssetFiltersDto } from './dto/asset-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new asset' })
  @ApiResponse({ status: 201, description: 'Asset created' })
  async create(
    @Body() dto: CreateAssetDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.assetsService.create(dto, userId);
  }

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

  @Get(':id/depreciation')
  @ApiOperation({ summary: 'Get asset depreciation calculation' })
  @ApiResponse({ status: 200, description: 'Returns depreciation details' })
  @ApiResponse({ status: 404, description: 'Asset not found or missing data' })
  async getDepreciation(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.getDepreciation(id);
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

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate an asset' })
  @ApiResponse({ status: 201, description: 'Asset duplicated' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DuplicateAssetDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.assetsService.duplicate(id, dto, userId);
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

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import assets from CSV' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Import results' })
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    return this.assetsService.importCsv(file.buffer, userId);
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
