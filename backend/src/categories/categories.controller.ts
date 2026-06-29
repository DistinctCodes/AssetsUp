import { Controller, Get, Post, Body, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheKey } from '@nestjs/cache-manager';
import { CacheService } from '../cache/cache.service';

@Controller('categories')
export class CategoriesController {
  private readonly CATEGORIES_CACHE_KEY = 'categories_list_all';

  constructor(private readonly cacheService: CacheService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheKey('categories_list_all')
  async getAllCategories() {
    return [{ id: 1, name: 'DeFi Vaults' }];
  }

  @Post()
  async createCategory(@Body() _body: any) {
    await this.cacheService.del(this.CATEGORIES_CACHE_KEY);
    return { success: true };
  }
}
