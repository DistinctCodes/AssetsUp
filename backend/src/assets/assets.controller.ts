import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto, BulkCreateAssetDto } from './dto/create-asset.dto';
import {
  UpdateAssetDto,
  UpdateAssetStatusDto,
  BulkUpdateAssetDto,
  BulkDeleteAssetDto,
} from './dto/update-asset.dto';
import { AssetQueryDto } from './dto/asset-query.dto';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(ValidationPipe) createAssetDto: CreateAssetDto,
    @Request() req,
  ) {
    const userId = req.user?.id || 'system';
    return this.assetsService.create(createAssetDto, userId);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  bulkCreate(
    @Body(ValidationPipe) bulkCreateDto: BulkCreateAssetDto,
    @Request() req,
  ) {
    const userId = req.user?.id || 'system';
    return this.assetsService.bulkCreate(bulkCreateDto, userId);
  }

  @Get()
  findAll(@Query(ValidationPipe) query: AssetQueryDto) {
    return this.assetsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateAssetDto: UpdateAssetDto,
    @Request() req,
  ) {
    const userId = req.user?.id || 'system';
    return this.assetsService.update(id, updateAssetDto, userId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateStatusDto: UpdateAssetStatusDto,
    @Request() req,
  ) {
    const userId = req.user?.id || 'system';
    return this.assetsService.updateStatus(id, updateStatusDto, userId);
  }

  @Put('bulk')
  bulkUpdate(
    @Body(ValidationPipe) bulkUpdateDto: BulkUpdateAssetDto,
    @Request() req,
  ) {
    const userId = req.user?.id || 'system';
    return this.assetsService.bulkUpdate(bulkUpdateDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const userId = req.user?.id || 'system';
    return this.assetsService.remove(id, userId);
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  bulkDelete(
    @Body(ValidationPipe) bulkDeleteDto: BulkDeleteAssetDto,
    @Request() req,
  ) {
    const userId = req.user?.id || 'system';
    return this.assetsService.bulkDelete(bulkDeleteDto, userId);
  }
}