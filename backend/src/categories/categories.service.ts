import {
  ConflictException,
  Injectable,
  NotFoundException,
  Inject,
  CACHE_MANAGER,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

export interface CategoryWithCount extends Category {
  assetCount: number;
}

@Injectable()
export class CategoriesService {
  private readonly listCacheKey = 'GET:/api/categories';

  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  private cacheDetailKey(id: string): string {
    return `GET:/api/categories/${id}`;
  }

  private async invalidateCache(id?: string): Promise<void> {
    await this.cacheManager.del(this.listCacheKey);
    if (id) {
      await this.cacheManager.del(this.cacheDetailKey(id));
    }
  }

  async findAll(): Promise<CategoryWithCount[]> {
    const rows: (Category & { assetCount: string })[] = await this.repo.query(`
      SELECT c.*, COALESCE(COUNT(a.id), 0)::int AS "assetCount"
      FROM asset_categories c
      LEFT JOIN assets a ON a."categoryId" = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    return rows.map((r) => ({ ...r, assetCount: Number(r.assetCount) }));
  }

  async findOne(id: string): Promise<Category> {
    const cat = await this.repo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    await this.ensureNameUnique(dto.name);
    const saved = await this.repo.save(this.repo.create(dto));
    await this.invalidateCache(saved.id);
    return saved;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);
    if (dto.name && dto.name !== category.name) {
      await this.ensureNameUnique(dto.name);
    }

    Object.assign(category, dto);
    const saved = await this.repo.save(category);
    await this.invalidateCache(id);
    return saved;
  }

  async remove(id: string): Promise<void> {
    const cat = await this.findOne(id);
    await this.repo.remove(cat);
    await this.invalidateCache(id);
  }

  private async ensureNameUnique(name: string): Promise<void> {
    const existing = await this.repo.findOne({ where: { name } });
    if (existing) {
      throw new ConflictException('A category with this name already exists');
    }
  }
}
