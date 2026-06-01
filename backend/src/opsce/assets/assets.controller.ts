import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { TransferAssetDto } from './dto/transfer-asset.dto';
import { UserRole } from '../users/entities/user.entity';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  private getUser(req: Request) {
    const user = req.user as { id: string; role?: string } | undefined;
    if (!user || !user.id) {
      throw new UnauthorizedException('Authentication required');
    }
    return user;
  }

  private assertRole(user: { role?: string }, allowedRoles: string[]) {
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(@Req() req: Request, @Body() dto: CreateAssetDto) {
    const user = this.getUser(req);
    this.assertRole(user, [UserRole.ADMIN, UserRole.MANAGER]);
    return this.assetsService.create(dto, user.id);
  }

  @Get()
  async findAll(
    @Req() req: Request,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit = 25,
  ) {
    this.getUser(req);
    return this.assetsService.findAll(page, limit);
  }

  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    this.getUser(req);
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
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateAssetDto) {
    const user = this.getUser(req);
    this.assertRole(user, [UserRole.ADMIN, UserRole.MANAGER]);
    return this.assetsService.update(id, dto, user.id);
  }

  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const user = this.getUser(req);
    this.assertRole(user, [UserRole.ADMIN]);
    return this.assetsService.softRemove(id, user.id);
  }

  @Post(':id/transfer')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async transfer(@Req() req: Request, @Param('id') id: string, @Body() dto: TransferAssetDto) {
    const user = this.getUser(req);
    this.assertRole(user, [UserRole.ADMIN, UserRole.MANAGER]);
    return this.assetsService.transfer(id, dto, user.id);
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
