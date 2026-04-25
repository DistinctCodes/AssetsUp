import { Body, Controller, Delete, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { BulkUpdateStatusDto } from './dto/bulk-update-status.dto';
import { BulkDeleteAssetsDto } from './dto/bulk-delete-assets.dto';
import { BulkTransferDepartmentDto } from './dto/bulk-transfer-department.dto';
import { UpdateAssetTagsDto } from './dto/update-asset-tags.dto';
import { SearchAssetsDto } from './dto/search-assets.dto';

@ApiTags('Assets')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Patch('bulk-status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  bulkStatus(@Body() dto: BulkUpdateStatusDto, @Req() req: { user?: { id?: string } }) {
    return this.assetsService.bulkUpdateStatus(dto.ids, dto.status, req.user?.id || null);
  }

  @Delete('bulk')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  bulkDelete(@Body() dto: BulkDeleteAssetsDto, @Req() req: { user?: { id?: string } }) {
    return this.assetsService.bulkDelete(dto.ids, req.user?.id || null);
  }

  @Patch('bulk-department')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  bulkDepartment(@Body() dto: BulkTransferDepartmentDto, @Req() req: { user?: { id?: string } }) {
    return this.assetsService.bulkTransferDepartment(dto.ids, dto.departmentId, req.user?.id || null);
  }

  @Patch(':id/tags')
  updateTags(
    @Param('id') id: string,
    @Body() dto: UpdateAssetTagsDto,
    @Req() req: { user?: { id?: string } },
  ) {
    return this.assetsService.updateTags(id, dto.tags, req.user?.id || null);
  }

  @Get('search')
  search(@Query() query: SearchAssetsDto) {
    return this.assetsService.search(query.q || '');
  }
}
