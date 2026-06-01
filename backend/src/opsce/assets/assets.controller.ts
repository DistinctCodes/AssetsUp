import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssetsService } from './assets.service';
import { FilterAssetsDto } from './dto/filter-assets.dto';

@Controller('assets')
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  async findAll(
    @Query() filter: FilterAssetsDto,
    @Query('page') page = '1',
    @Query('perPage') perPage = '20',
  ) {
    const pageNumber = parseInt(page, 10) || 1;
    const perPageNumber = parseInt(perPage, 10) || 20;
    return this.assetsService.findAll(filter, pageNumber, perPageNumber);
  }
}
