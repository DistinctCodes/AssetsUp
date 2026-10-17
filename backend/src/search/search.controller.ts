import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService, SearchType } from './search.service';

@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('q') q = '',
    @Query('types') types?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedTypes = types
      ? (types.split(',').filter(Boolean) as SearchType[])
      : undefined;
    return this.searchService.search(
      q,
      parsedTypes,
      limit ? Number(limit) : undefined,
    );
  }
}
