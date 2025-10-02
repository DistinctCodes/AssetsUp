import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { SearchQueryDto, SearchEntity } from './dto/search-query.dto';
import { SearchResponseDto, SearchMetadata } from './dto/search-response.dto';
import { SearchResultDto } from './dto/search-result.dto';
import { InventoryItem } from 'src/inventory/entities/inventory-item.entity';
import { Asset } from 'src/assets/entities/assest.entity';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(Asset)
    private assetRepository: Repository<Asset>,
    @InjectRepository(InventoryItem)
    private inventoryRepository: Repository<InventoryItem>,
  ) {}

  async search(
    searchQuery: SearchQueryDto,
  ): Promise<SearchResponseDto<SearchResultDto>> {
    const {
      query,
      category,
      department,
      supplier,
      location,
      entityType,
      page,
      limit,
      sortBy,
      sortOrder,
    } = searchQuery;

    let results: SearchResultDto[] = [];
    let total = 0;

    // Search based on entity type
    if (entityType === SearchEntity.ALL || entityType === SearchEntity.ASSET) {
      const assetResults = await this.searchAssets(searchQuery);
      results.push(...assetResults.data);
      total += assetResults.total;
    }

    if (
      entityType === SearchEntity.ALL ||
      entityType === SearchEntity.INVENTORY
    ) {
      const inventoryResults = await this.searchInventory(searchQuery);
      results.push(...inventoryResults.data);
      total += inventoryResults.total;
    }

    // Sort combined results
    results = this.sortResults(results, sortBy, sortOrder);

    // Apply pagination to combined results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = results.slice(startIndex, endIndex);

    // Build metadata
    const metadata: SearchMetadata = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: endIndex < total,
      hasPreviousPage: page > 1,
    };

    // Track applied filters
    const appliedFilters: Record<string, any> = {};
    if (query) appliedFilters.query = query;
    if (category) appliedFilters.category = category;
    if (department) appliedFilters.department = department;
    if (supplier) appliedFilters.supplier = supplier;
    if (location) appliedFilters.location = location;
    if (entityType) appliedFilters.entityType = entityType;

    this.logger.log(`Search completed: ${total} results found`);

    return {
      data: paginatedResults,
      metadata,
      appliedFilters,
    };
  }

  private async searchAssets(
    searchQuery: SearchQueryDto,
  ): Promise<{ data: SearchResultDto[]; total: number }> {
    const queryBuilder = this.assetRepository.createQueryBuilder('asset');

    // Apply filters
    this.applyFilters(queryBuilder, searchQuery, 'asset');

    // Get results
    const [assets, total] = await queryBuilder.getManyAndCount();

    // Map to SearchResultDto
    const data = assets.map((asset) => this.mapAssetToSearchResult(asset));

    return { data, total };
  }

  private async searchInventory(
    searchQuery: SearchQueryDto,
  ): Promise<{ data: SearchResultDto[]; total: number }> {
    const queryBuilder =
      this.inventoryRepository.createQueryBuilder('inventory');

    // Apply filters
    this.applyFilters(queryBuilder, searchQuery, 'inventory');

    // Get results
    const [items, total] = await queryBuilder.getManyAndCount();

    // Map to SearchResultDto
    const data = items.map((item) => this.mapInventoryToSearchResult(item));

    return { data, total };
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<any>,
    searchQuery: SearchQueryDto,
    entityAlias: string,
  ): void {
    const { query, category, department, supplier, location } = searchQuery;

    // Text search across multiple fields
    if (query) {
      queryBuilder.andWhere(
        `(
          LOWER(${entityAlias}.name) LIKE LOWER(:query) OR 
          LOWER(${entityAlias}.description) LIKE LOWER(:query) OR
          LOWER(${entityAlias}.model) LIKE LOWER(:query)
        )`,
        { query: `%${query}%` },
      );
    }

    // Category filter
    if (category) {
      queryBuilder.andWhere(
        `LOWER(${entityAlias}.category) = LOWER(:category)`,
        {
          category,
        },
      );
    }

    // Department filter
    if (department) {
      queryBuilder.andWhere(
        `LOWER(${entityAlias}.department) = LOWER(:department)`,
        { department },
      );
    }

    // Supplier filter
    if (supplier) {
      queryBuilder.andWhere(
        `LOWER(${entityAlias}.supplier) = LOWER(:supplier)`,
        {
          supplier,
        },
      );
    }

    // Location filter
    if (location) {
      queryBuilder.andWhere(
        `LOWER(${entityAlias}.location) = LOWER(:location)`,
        {
          location,
        },
      );
    }
  }

  private sortResults(
    results: SearchResultDto[],
    sortBy: string,
    sortOrder: string,
  ): SearchResultDto[] {
    return results.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (aValue === bValue) return 0;

      const comparison = aValue > bValue ? 1 : -1;
      return sortOrder === 'ASC' ? comparison : -comparison;
    });
  }

  private mapAssetToSearchResult(asset: any): SearchResultDto {
    return {
      id: asset.id,
      entityType: 'asset',
      name: asset.name,
      description: asset.description || '',
      category: asset.category || '',
      department: asset.department || '',
      supplier: asset.supplier || '',
      location: asset.location || '',
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }

  private mapInventoryToSearchResult(inventory: any): SearchResultDto {
    return {
      id: inventory.id,
      entityType: 'inventory',
      name: inventory.name,
      description: inventory.description || '',
      category: inventory.category || '',
      department: inventory.department || '',
      supplier: inventory.supplier || '',
      location: inventory.location || '',
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
    };
  }

  // Helper method to get unique filter values
  async getFilterOptions(): Promise<{
    categories: string[];
    departments: string[];
    suppliers: string[];
    locations: string[];
  }> {
    const assetCategories = await this.assetRepository
      .createQueryBuilder('asset')
      .select('DISTINCT asset.category', 'category')
      .where('asset.category IS NOT NULL')
      .getRawMany();

    const inventoryCategories = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .select('DISTINCT inventory.category', 'category')
      .where('inventory.category IS NOT NULL')
      .getRawMany();

    // Similar queries for departments, suppliers, locations
    // Combine and deduplicate results

    const categories = [
      ...new Set([
        ...assetCategories.map((c) => c.category),
        ...inventoryCategories.map((c) => c.category),
      ]),
    ];

    // Repeat for other fields...

    return {
      categories,
      departments: [], // Implement similar logic
      suppliers: [], // Implement similar logic
      locations: [], // Implement similar logic
    };
  }
}
