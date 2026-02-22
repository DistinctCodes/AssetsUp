import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './category.entity';

const mockCategory: Category = {
  id: 'uuid-1',
  name: 'Electronics',
} as Category;

const mockRepo = {
  query: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return categories with numeric assetCount', async () => {
      const rawRows = [
        { ...mockCategory, assetCount: '3' },
        { id: 'uuid-2', name: 'Furniture', assetCount: '0' },
      ];
      mockRepo.query.mockResolvedValue(rawRows);

      const result = await service.findAll();

      expect(mockRepo.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual([
        { ...mockCategory, assetCount: 3 },
        { id: 'uuid-2', name: 'Furniture', assetCount: 0 },
      ]);
      expect(typeof result[0].assetCount).toBe('number');
    });

    it('should return an empty array when no categories exist', async () => {
      mockRepo.query.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a category when found', async () => {
      mockRepo.findOne.mockResolvedValue(mockCategory);

      const result = await service.findOne('uuid-1');

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('missing-id')).rejects.toThrow('Category not found');
    });
  });

  describe('create', () => {
    const dto = { name: 'Electronics' };

    it('should create and return a new category', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(mockCategory);
      mockRepo.save.mockResolvedValue(mockCategory);

      const result = await service.create(dto);

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { name: dto.name } });
      expect(mockRepo.create).toHaveBeenCalledWith(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(mockCategory);
      expect(result).toEqual(mockCategory);
    });

    it('should throw ConflictException when a category with the same name exists', async () => {
      mockRepo.findOne.mockResolvedValue(mockCategory);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      await expect(service.create(dto)).rejects.toThrow(
        'A category with this name already exists',
      );
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove the category successfully', async () => {
      mockRepo.findOne.mockResolvedValue(mockCategory);
      mockRepo.remove.mockResolvedValue(undefined);

      await service.remove('uuid-1');

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
      expect(mockRepo.remove).toHaveBeenCalledWith(mockCategory);
    });

    it('should throw NotFoundException if category does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toThrow(NotFoundException);
      expect(mockRepo.remove).not.toHaveBeenCalled();
    });
  });
});