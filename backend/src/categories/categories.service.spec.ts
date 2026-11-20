import { CategoriesService } from './categories.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let mockRepo: any;
  let mockAssetRepo: any;

  beforeEach(() => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    };
    mockAssetRepo = { count: jest.fn().mockResolvedValue(0) };
    service = new CategoriesService(mockRepo, mockAssetRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all categories', async () => {
      const cats = [
        { id: 'c-1', name: 'Laptops', code: 'LAP' },
        { id: 'c-2', name: 'Monitors', code: 'MON' },
      ];
      mockRepo.find.mockResolvedValue(cats);
      const result = await service.findAll();
      expect(result).toEqual(cats);
      expect(mockRepo.find).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when no categories exist', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('returns a category by id', async () => {
      const cat = { id: 'c-1', name: 'Laptops', code: 'LAP' };
      mockRepo.findOne.mockResolvedValue(cat);
      const result = await service.findById('c-1');
      expect(result).toEqual(cat);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'c-1' } });
    });

    it('throws NotFoundException when category does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById('nonexistent')).rejects.toThrow(
        'Category nonexistent not found',
      );
    });
  });

  describe('create', () => {
    it('creates a category with depreciation defaults', async () => {
      const dto = {
        name: 'Laptops',
        code: 'LAP',
        defaultDepreciationRate: 20,
        defaultUsefulLifeMonths: 36,
      };
      const created = { id: 'c-1', ...dto };
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      const result = await service.create(dto);
      expect(result.id).toBe('c-1');
      expect(result.defaultUsefulLifeMonths).toBe(36);
      expect(result.defaultDepreciationRate).toBe(20);
      expect(mockRepo.create).toHaveBeenCalledWith(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(created);
    });

    it('creates a category with minimal fields', async () => {
      const dto = { name: 'Furniture', code: 'FUR' };
      const created = {
        id: 'c-2',
        ...dto,
        defaultDepreciationRate: 0,
        defaultUsefulLifeMonths: 36,
      };
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      const result = await service.create(dto);
      expect(result.name).toBe('Furniture');
      expect(result.code).toBe('FUR');
    });

    it('creates a category with parentCategoryId', async () => {
      const dto = {
        name: 'Gaming Laptops',
        code: 'G-LAP',
        parentCategoryId: 'c-1',
      };
      const created = { id: 'c-3', ...dto };
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      const result = await service.create(dto);
      expect(result.parentCategoryId).toBe('c-1');
    });

    it('creates a category with all optional fields', async () => {
      const dto = {
        name: 'Servers',
        code: 'SRV',
        description: 'Rack and tower servers',
        icon: 'server-icon',
        defaultDepreciationRate: 25,
        defaultUsefulLifeMonths: 60,
        parentCategoryId: 'c-parent',
      };
      const created = { id: 'c-4', ...dto };
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      const result = await service.create(dto);
      expect(result.description).toBe('Rack and tower servers');
      expect(result.icon).toBe('server-icon');
      expect(result.parentCategoryId).toBe('c-parent');
    });
  });

  describe('update', () => {
    it('updates an existing category', async () => {
      const existing = {
        id: 'c-1',
        name: 'Laptops',
        code: 'LAP',
        defaultDepreciationRate: 20,
      };
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockImplementation((dto) =>
        Promise.resolve({ ...existing, ...dto }),
      );

      const result = await service.update('c-1', { name: 'Notebooks' });
      expect(result.name).toBe('Notebooks');
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when updating non-existent category', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update('nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when setting self as parent', async () => {
      const existing = { id: 'c-1', name: 'Laptops', code: 'LAP' };
      mockRepo.findOne.mockResolvedValue(existing);

      await expect(
        service.update('c-1', { parentCategoryId: 'c-1' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('c-1', { parentCategoryId: 'c-1' }),
      ).rejects.toThrow('A category cannot be its own parent');
    });

    it('allows updating depreciation defaults', async () => {
      const existing = {
        id: 'c-1',
        name: 'Laptops',
        code: 'LAP',
        defaultDepreciationRate: 20,
        defaultUsefulLifeMonths: 36,
      };
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockImplementation((dto) =>
        Promise.resolve({ ...existing, ...dto }),
      );

      const result = await service.update('c-1', {
        defaultDepreciationRate: 30,
        defaultUsefulLifeMonths: 48,
      });
      expect(result.defaultDepreciationRate).toBe(30);
      expect(result.defaultUsefulLifeMonths).toBe(48);
    });

    it('allows updating parentCategoryId to a different category', async () => {
      const existing = { id: 'c-1', name: 'Laptops', code: 'LAP' };
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockImplementation((dto) =>
        Promise.resolve({ ...existing, ...dto }),
      );

      const result = await service.update('c-1', { parentCategoryId: 'c-parent' });
      expect(result.parentCategoryId).toBe('c-parent');
    });
  });

  describe('delete', () => {
    it('deletes an existing category', async () => {
      const existing = { id: 'c-1', name: 'Laptops', code: 'LAP' };
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.remove.mockResolvedValue(existing);

      await service.delete('c-1');
      expect(mockRepo.remove).toHaveBeenCalledWith(existing);
    });

    it('throws NotFoundException when deleting non-existent category', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('depreciation defaults', () => {
    it('creates category with zero depreciation rate', async () => {
      const dto = {
        name: 'Free Software',
        code: 'FREE',
        defaultDepreciationRate: 0,
        defaultUsefulLifeMonths: 12,
      };
      const created = { id: 'c-5', ...dto };
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      const result = await service.create(dto);
      expect(result.defaultDepreciationRate).toBe(0);
    });

    it('creates category with 100% depreciation rate', async () => {
      const dto = {
        name: 'Consumables',
        code: 'CON',
        defaultDepreciationRate: 100,
        defaultUsefulLifeMonths: 1,
      };
      const created = { id: 'c-6', ...dto };
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      const result = await service.create(dto);
      expect(result.defaultDepreciationRate).toBe(100);
      expect(result.defaultUsefulLifeMonths).toBe(1);
    });

    it('preserves depreciation defaults through update cycle', async () => {
      const existing = {
        id: 'c-1',
        name: 'Laptops',
        code: 'LAP',
        defaultDepreciationRate: 20,
        defaultUsefulLifeMonths: 36,
      };
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockImplementation((dto) =>
        Promise.resolve({ ...existing, ...dto }),
      );

      const updated = await service.update('c-1', { name: 'Notebooks' });
      expect(updated.defaultDepreciationRate).toBe(20);
      expect(updated.defaultUsefulLifeMonths).toBe(36);
    });
  });
});

describe('CategoriesService.delete (in use)', () => {
  let service: CategoriesService;
  let repo: any;
  let assetRepo: any;

  beforeEach(() => {
    repo = {
      findOne: jest.fn().mockResolvedValue({ id: 'c-1', name: 'Laptops' }),
      count: jest.fn().mockResolvedValue(0),
      remove: jest.fn().mockImplementation((c) => Promise.resolve(c)),
    };
    assetRepo = { count: jest.fn().mockResolvedValue(0) };
    service = new CategoriesService(repo, assetRepo);
  });

  it('removes an unused category', async () => {
    await service.delete('c-1');
    expect(repo.count).toHaveBeenCalledWith({ where: { parentCategoryId: 'c-1' } });
    expect(assetRepo.count).toHaveBeenCalledWith({ where: { categoryId: 'c-1' } });
    expect(repo.remove).toHaveBeenCalledTimes(1);
  });

  it('returns 409 when the category has child categories', async () => {
    repo.count.mockResolvedValue(2);
    await expect(service.delete('c-1')).rejects.toThrow(ConflictException);
    await expect(service.delete('c-1')).rejects.toThrow(/2 subcategories/);
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('returns 409 when assets use the category', async () => {
    assetRepo.count.mockResolvedValue(3);
    await expect(service.delete('c-1')).rejects.toThrow(ConflictException);
    await expect(service.delete('c-1')).rejects.toThrow(/3 asset\(s\)/);
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('still returns 404 for an unknown category', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.delete('nope')).rejects.toThrow(NotFoundException);
  });
});
