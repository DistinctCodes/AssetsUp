import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { TransferAssetDto } from './dto/transfer-asset.dto';
import {
  BulkAssetOperationDto,
  BulkOperationResult,
} from './dto/bulk-asset-operation.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { Asset } from './entities/asset.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';

@ApiTags('Assets')
@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(PaginatedResponseDto, Asset)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  private getUser(req: Request) {
    const user = req.user as { id: string; role?: string } | undefined;
    if (!user || !user.id) {
      throw new Error('Authentication required');
    }
    return user;
  }

  // ─── Create ─────────────────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new asset (ADMIN only)' })
  @ApiBody({ type: CreateAssetDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Asset successfully created.',
    type: Asset,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or duplicate serial number.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT token.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient role — ADMIN required.',
  })
  create(@Body() createAssetDto: CreateAssetDto, @Req() req: Request) {
    return this.assetsService.create(createAssetDto);
  }

  // ─── Bulk operations ────────────────────────────────────────────────────────

  @Post('bulk')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Apply a bulk operation to multiple assets (ADMIN or MANAGER)',
    description:
      'Accepts up to 100 asset IDs and applies a single operation to all of them. ' +
      'Each asset is processed independently — partial success is possible. ' +
      'Supported operations: update-status, reassign, change-department, change-location, soft-delete.',
  })
  @ApiBody({ type: BulkAssetOperationDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk operation completed. Returns per-asset success/failure.',
    schema: {
      example: {
        succeeded: ['uuid-1', 'uuid-2'],
        failed: [{ id: 'uuid-3', reason: 'Asset with ID uuid-3 not found' }],
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'More than 100 IDs supplied, or invalid payload.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT token.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient role — ADMIN or MANAGER required.',
  })
  async bulkOperation(
    @Body() dto: BulkAssetOperationDto,
    @Req() req: Request,
  ): Promise<BulkOperationResult> {
    const user = this.getUser(req);
    return this.assetsService.bulkOperation(dto, user.id);
  }

  // ─── Find all ───────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'List all assets with pagination and optional search',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based, default 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default 20, max 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Full-text search across name, category, and serial number',
    example: 'laptop',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of assets.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(PaginatedResponseDto) },
        {
          properties: {
            data: { type: 'array', items: { $ref: getSchemaPath(Asset) } },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT token.',
  })
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.assetsService.findAll(paginationDto, search);
  }

  // ─── Find one ───────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get a single asset by ID' })
  @ApiParam({
    name: 'id',
    description: 'Asset UUID',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The requested asset.',
    type: Asset,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset not found.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT token.',
  })
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an asset (ADMIN only)' })
  @ApiParam({
    name: 'id',
    description: 'Asset UUID',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @ApiBody({ type: UpdateAssetDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Asset successfully updated.',
    type: Asset,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset not found.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT token.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient role — ADMIN required.',
  })
  update(@Param('id') id: string, @Body() updateAssetDto: UpdateAssetDto, @Req() req: Request) {
    const user = this.getUser(req);
    return this.assetsService.update(id, updateAssetDto, user.id);
  }

  // ─── Transfer ───────────────────────────────────────────────────────────────

  @Post(':id/transfer')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({ summary: 'Transfer an asset to new assignment' })
  @ApiParam({
    name: 'id',
    description: 'Asset UUID',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @ApiBody({ type: TransferAssetDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Asset transfer completed.',
    type: Asset,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid transfer data.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT token.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient role — ADMIN or MANAGER required.',
  })
  transfer(@Param('id') id: string, @Body() dto: TransferAssetDto, @Req() req: Request) {
    const user = this.getUser(req);
    return this.assetsService.transfer(id, dto, user.id);
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an asset (ADMIN only)' })
  @ApiParam({
    name: 'id',
    description: 'Asset UUID',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Asset successfully deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset not found.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT token.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient role — ADMIN required.',
  })
  remove(@Param('id') id: string, @Req() req: Request) {
    const user = this.getUser(req);
    return this.assetsService.remove(id, user.id);
  }
}