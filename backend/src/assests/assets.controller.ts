import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator'; // Role Decorator
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';

@ApiTags('Assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create asset with auto-generated QR and barcode' })
  @ApiResponse({ status: 201, description: 'Asset created with S3 code keys' })
  async create(@Body() createAssetDto: CreateAssetDto) {
    return this.assetsService.createAsset(createAssetDto);
  }

  @Get('scan')
  @ApiOperation({ summary: 'Look up asset by scanned UUID or barcode value' })
  @ApiQuery({ name: 'code', required: true, example: 'AST-10042' })
  @ApiResponse({ status: 200, description: 'Asset retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async scan(@Query('code') code: string) {
    return this.assetsService.scanLookup(code);
  }

  @Get(':id/qrcode')
  @ApiOperation({ summary: 'Get 1-hour pre-signed S3 URL for asset QR code' })
  @ApiResponse({ status: 200, description: 'Pre-signed S3 URL generated' })
  @ApiResponse({ status: 404, description: 'QR Code not found' })
  async getQrCode(@Param('id') id: string) {
    return this.assetsService.getQrCodeUrl(id);
  }

  @Get(':id/barcode')
  @ApiOperation({ summary: 'Get 1-hour pre-signed S3 URL for asset barcode' })
  @ApiResponse({ status: 200, description: 'Pre-signed S3 URL generated' })
  @ApiResponse({ status: 404, description: 'Barcode not found' })
  async getBarcode(@Param('id') id: string) {
    return this.assetsService.getBarcodeUrl(id);
  }

  @Post(':id/regenerate-codes')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate QR and barcode images in S3 (Admin only)' })
  @ApiResponse({ status: 200, description: 'Codes regenerated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async regenerateCodes(@Param('id') id: string) {
    return this.assetsService.regenerateCodes(id);
  }
}