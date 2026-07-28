import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    if (dto.parentCategoryId && dto.parentCategoryId === id) {
      throw new BadRequestException('A category cannot be its own parent');
    }
    Object.assign(cat, dto);
    return this.categoryRepo.save(cat);
  }

  async delete(id: string) {
    const cat = await this.findById(id);
    return this.categoryRepo.remove(cat);
  }
}
