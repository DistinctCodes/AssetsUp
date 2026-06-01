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
  }
}
