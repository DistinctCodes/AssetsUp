import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const mockCategory = { id: 'uuid-1', name: 'Electronics' };
const mockCategoryWithCount = { ...mockCategory, assetCount: 5 };

const mockService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
};

describe('CategoriesController', () => {
  let controller: CategoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [{ provide: CategoriesService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CategoriesController>(CategoriesController);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all categories with asset counts', async () => {
      mockService.findAll.mockResolvedValue([mockCategoryWithCount]);

      const result = await controller.findAll();

      expect(mockService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockCategoryWithCount]);
    });
  });

  describe('findOne', () => {
    it('should return a single category by id', async () => {
      mockService.findOne.mockResolvedValue(mockCategory);

      const result = await controller.findOne('uuid-1');

      expect(mockService.findOne).toHaveBeenCalledWith('uuid-1');
      expect(result).toEqual(mockCategory);
    });

    it('should propagate exceptions from the service', async () => {
      mockService.findOne.mockRejectedValue(new Error('Category not found'));

      await expect(controller.findOne('missing-id')).rejects.toThrow('Category not found');
    });
  });

  describe('create', () => {
    const dto = { name: 'Electronics' };

    it('should create and return a new category', async () => {
      mockService.create.mockResolvedValue(mockCategory);

      const result = await controller.create(dto);

      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockCategory);
    });

    it('should propagate conflict exceptions from the service', async () => {
      mockService.create.mockRejectedValue(new Error('A category with this name already exists'));

      await expect(controller.create(dto)).rejects.toThrow(
        'A category with this name already exists',
      );
    });
  });

  describe('remove', () => {
    it('should call service.remove with the correct id', async () => {
      mockService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('uuid-1');

      expect(mockService.remove).toHaveBeenCalledWith('uuid-1');
      expect(result).toBeUndefined();
    });

    it('should propagate exceptions from the service', async () => {
      mockService.remove.mockRejectedValue(new Error('Category not found'));

      await expect(controller.remove('missing-id')).rejects.toThrow('Category not found');
    });
  });
});