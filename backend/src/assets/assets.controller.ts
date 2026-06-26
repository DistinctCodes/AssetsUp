import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dtos/create-asset.dto';
import { UpdateAssetDto } from './dtos/update-asset.dto';
import { AssetListQueryDto } from './dtos/asset-list-query.dto';
import { UpdateStatusDto } from './dtos/update-status.dto';

@Controller('assets')
@UseGuards(AuthGuard('jwt'))
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  async create(@Body() dto: CreateAssetDto, @Req() req: any) {
    return this.assetsService.create(dto, req.user?.id);
  }

  @Get()
  async findAll(@Query() query: AssetListQueryDto) {
    return this.assetsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.assetsService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAssetDto, @Req() req: any) {
    return this.assetsService.update(id, dto, req.user?.id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.assetsService.remove(id);
    return { message: 'Asset deleted successfully' };
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @Req() req: any) {
    return this.assetsService.updateStatus(id, dto, req.user?.id);
  }

  @Post(':id/dispose')
  async dispose(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.assetsService.dispose(id, body, req.user?.id);
  }
}
