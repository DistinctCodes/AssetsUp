import { Controller, Get, Query } from '@nestjs/common';
import { SearchService, SearchType } from './search.service';

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
