import { Controller, Get, Post, Body, Put, Param, Delete, UseInterceptors } from '@nestjs/common';
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
    // Database retrieval execution logic goes here
    return [{ id: 1, name: 'DeFi Vaults' }];
  }

  @Post()
  async createCategory(@Body() body: any) {
    // 1. Process standard write operations to database repository context
    
    // 2. Clear out the cached asset layout lists instantly to invalidate stale states
    await this.cacheService.del(this.CATEGORIES_CACHE_KEY);
    return { success: true };
  }
}