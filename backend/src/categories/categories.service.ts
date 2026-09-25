import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async findAll() {
    return this.categoryRepo.find();
  }

  async findById(id: string) {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException(`Category ${id} not found`);
    return cat;
  }

  async create(dto: Partial<Category>) {
    const cat = this.categoryRepo.create(dto);
    return this.categoryRepo.save(cat);
  }

  async update(id: string, dto: Partial<Category>) {
    const cat = await this.findById(id);
    if (dto.parentCategoryId) {
      await this.assertNoCircularReference(id, dto.parentCategoryId);
    }
    Object.assign(cat, dto);
    return this.categoryRepo.save(cat);
  }

  /**
   * Rejects setting `categoryId`'s parent to `proposedParentId` if that
   * would create a cycle — either directly (a category as its own
   * parent) or indirectly (categoryId already appears somewhere in
   * proposedParentId's own ancestor chain), which would otherwise loop
   * forever when rendering or walking the category tree.
   */
  private async assertNoCircularReference(
    categoryId: string,
    proposedParentId: string,
  ) {
    if (proposedParentId === categoryId) {
      throw new BadRequestException('A category cannot be its own parent');
    }

    // Bounded by the number of categories that exist: a chain can't be
    // longer than that without already containing a cycle, so this also
    // catches (rather than infinite-looping on) a cycle that somehow
    // already exists in stored data from before this check was added.
    const maxDepth = await this.categoryRepo.count();

    let currentId: string | null | undefined = proposedParentId;
    for (let depth = 0; currentId && depth <= maxDepth; depth++) {
      if (currentId === categoryId) {
        throw new BadRequestException(
          'This change would create a circular category reference',
        );
      }
      const current = await this.categoryRepo.findOne({
        where: { id: currentId },
      });
      currentId = current?.parentCategoryId ?? null;
    }
  }

  async delete(id: string) {
    const cat = await this.findById(id);
    return this.categoryRepo.remove(cat);
  }
}
