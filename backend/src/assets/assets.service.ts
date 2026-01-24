import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Asset, AssetStatus } from './entities/asset.entity';
import { AssetCategory } from '../asset-categories/asset-category.entity';
import { Department } from '../departments/entities/department.entity';
import { User } from '../users/entities/user.entity';
import { CreateAssetDto, BulkCreateAssetDto } from './dto/create-asset.dto';
import {
  UpdateAssetDto,
  UpdateAssetStatusDto,
  BulkUpdateAssetDto,
  BulkDeleteAssetDto,
} from './dto/update-asset.dto';
import { AssetQueryDto } from './dto/asset-query.dto';

const ALLOWED_STATUS_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  [AssetStatus.ACTIVE]: [AssetStatus.ASSIGNED, AssetStatus.MAINTENANCE, AssetStatus.RETIRED],
  [AssetStatus.ASSIGNED]: [AssetStatus.ACTIVE, AssetStatus.MAINTENANCE, AssetStatus.RETIRED],
  [AssetStatus.MAINTENANCE]: [AssetStatus.ACTIVE, AssetStatus.ASSIGNED, AssetStatus.RETIRED],
  [AssetStatus.RETIRED]: [],
};

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(AssetCategory)
    private readonly categoryRepository: Repository<AssetCategory>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createAssetDto: CreateAssetDto, userId: string): Promise<Asset> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const category = await this.categoryRepository.findOne({
        where: { id: createAssetDto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Category with ID ${createAssetDto.categoryId} not found`,
        );
      }

      const department = await this.departmentRepository.findOne({
        where: { id: createAssetDto.departmentId },
      });
      if (!department) {
        throw new NotFoundException(
          `Department with ID ${createAssetDto.departmentId} not found`,
        );
      }

      let assignedUser = null;
      if (createAssetDto.assignedToId) {
        assignedUser = await this.userRepository.findOne({
          where: { id: createAssetDto.assignedToId },
        });
        if (!assignedUser) {
          throw new NotFoundException(
            `User with ID ${createAssetDto.assignedToId} not found`,
          );
        }
      }

      if (createAssetDto.serialNumber) {
        const existingAsset = await this.assetRepository.findOne({
          where: { serialNumber: createAssetDto.serialNumber },
          withDeleted: true,
        });
        if (existingAsset) {
          throw new ConflictException(
            `Asset with serial number ${createAssetDto.serialNumber} already exists`,
          );
        }
      }

      if (createAssetDto.purchaseDate) {
        const purchaseDate = new Date(createAssetDto.purchaseDate);
        if (purchaseDate > new Date()) {
          throw new BadRequestException('Purchase date cannot be in the future');
        }
      }

      const creatingUser = await this.userRepository.findOne({
        where: { id: userId },
      });

      const assetId = createAssetDto.assetId || (await this.generateAssetId());

      const existingAssetId = await this.assetRepository.findOne({
        where: { assetId },
        withDeleted: true,
      });
      if (existingAssetId) {
        throw new ConflictException(`Asset with ID ${assetId} already exists`);
      }

      const currentValue = this.calculateCurrentValue(
        createAssetDto.purchasePrice,
        createAssetDto.purchaseDate,
        category,
      );

      const asset = this.assetRepository.create({
        ...createAssetDto,
        assetId,
        category,
        department,
        location: createAssetDto.location,
        assignedTo: assignedUser,
        currentValue,
        createdBy: creatingUser,
        updatedBy: creatingUser,
      });

      const savedAsset = await queryRunner.manager.save(asset);
      await queryRunner.commitTransaction();

      this.logger.log(`Asset created: ${savedAsset.assetId} by user ${userId}`);

      return this.findOne(savedAsset.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create asset: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(query: AssetQueryDto) {
    const {
      page = 1,
      limit = 25,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      categoryId,
      departmentId,
      location,
      assignedToId,
      status,
      condition,
      purchaseDateFrom,
      purchaseDateTo,
      tags,
      manufacturer,
      model,
    } = query;

    const queryBuilder = this.assetRepository
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.department', 'department')
      .leftJoinAndSelect('asset.assignedTo', 'assignedTo')
      .leftJoinAndSelect('asset.createdBy', 'createdBy')
      .leftJoinAndSelect('asset.updatedBy', 'updatedBy');

    if (search) {
      queryBuilder.andWhere(
        '(asset.name ILIKE :search OR asset.assetId ILIKE :search OR asset.serialNumber ILIKE :search OR asset.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (categoryId) {
      queryBuilder.andWhere('asset.categoryId = :categoryId', { categoryId });
    }

    if (departmentId) {
      queryBuilder.andWhere('asset.departmentId = :departmentId', { departmentId });
    }

    if (location) {
      queryBuilder.andWhere('asset.location ILIKE :location', {
        location: `%${location}%`,
      });
    }

    if (assignedToId) {
      queryBuilder.andWhere('asset.assignedToId = :assignedToId', { assignedToId });
    }

    if (status) {
      queryBuilder.andWhere('asset.status = :status', { status });
    }

    if (condition) {
      queryBuilder.andWhere('asset.condition = :condition', { condition });
    }

    if (manufacturer) {
      queryBuilder.andWhere('asset.manufacturer ILIKE :manufacturer', {
        manufacturer: `%${manufacturer}%`,
      });
    }

    if (model) {
      queryBuilder.andWhere('asset.model ILIKE :model', { model: `%${model}%` });
    }

    if (purchaseDateFrom && purchaseDateTo) {
      queryBuilder.andWhere('asset.purchaseDate BETWEEN :dateFrom AND :dateTo', {
        dateFrom: purchaseDateFrom,
        dateTo: purchaseDateTo,
      });
    } else if (purchaseDateFrom) {
      queryBuilder.andWhere('asset.purchaseDate >= :dateFrom', {
        dateFrom: purchaseDateFrom,
      });
    } else if (purchaseDateTo) {
      queryBuilder.andWhere('asset.purchaseDate <= :dateTo', {
        dateTo: purchaseDateTo,
      });
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('asset.tags && ARRAY[:...tags]', { tags });
    }

    queryBuilder.orderBy(`asset.${sortBy}`, sortOrder as 'ASC' | 'DESC');

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string): Promise<Asset> {
    const asset = await this.assetRepository.findOne({
      where: { id },
      relations: ['category', 'department', 'assignedTo', 'createdBy', 'updatedBy'],
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    return asset;
  }

  async update(
    id: string,
    updateAssetDto: UpdateAssetDto,
    userId: string,
  ): Promise<Asset> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const asset = await this.findOne(id);

      if (updateAssetDto.categoryId) {
        const category = await this.categoryRepository.findOne({
          where: { id: updateAssetDto.categoryId },
        });
        if (!category) {
          throw new NotFoundException(
            `Category with ID ${updateAssetDto.categoryId} not found`,
          );
        }
      }

      if (updateAssetDto.departmentId) {
        const department = await this.departmentRepository.findOne({
          where: { id: updateAssetDto.departmentId },
        });
        if (!department) {
          throw new NotFoundException(
            `Department with ID ${updateAssetDto.departmentId} not found`,
          );
        }
      }

      if (updateAssetDto.assignedToId) {
        const assignedUser = await this.userRepository.findOne({
          where: { id: updateAssetDto.assignedToId },
        });
        if (!assignedUser) {
          throw new NotFoundException(
            `User with ID ${updateAssetDto.assignedToId} not found`,
          );
        }
      }

      if (
        updateAssetDto.serialNumber &&
        updateAssetDto.serialNumber !== asset.serialNumber
      ) {
        const existingAsset = await this.assetRepository.findOne({
          where: { serialNumber: updateAssetDto.serialNumber },
          withDeleted: true,
        });
        if (existingAsset && existingAsset.id !== id) {
          throw new ConflictException(
            `Asset with serial number ${updateAssetDto.serialNumber} already exists`,
          );
        }
      }

      if (updateAssetDto.purchaseDate) {
        const purchaseDate = new Date(updateAssetDto.purchaseDate);
        if (purchaseDate > new Date()) {
          throw new BadRequestException('Purchase date cannot be in the future');
        }
      }

      const updatingUser = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (updateAssetDto.purchasePrice || updateAssetDto.purchaseDate) {
        const category = updateAssetDto.categoryId
          ? await this.categoryRepository.findOne({
              where: { id: updateAssetDto.categoryId },
            })
          : asset.category;

        updateAssetDto['currentValue'] = this.calculateCurrentValue(
          updateAssetDto.purchasePrice || asset.purchasePrice,
          updateAssetDto.purchaseDate || asset.purchaseDate?.toISOString(),
          category,
        );
      }

      Object.assign(asset, updateAssetDto);
      asset.updatedBy = updatingUser;

      const updatedAsset = await queryRunner.manager.save(asset);
      await queryRunner.commitTransaction();

      this.logger.log(`Asset updated: ${updatedAsset.assetId} by user ${userId}`);

      return this.findOne(updatedAsset.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update asset: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateAssetStatusDto,
    userId: string,
  ): Promise<Asset> {
    const asset = await this.findOne(id);

    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[asset.status];
    if (!allowedTransitions.includes(updateStatusDto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${asset.status} to ${updateStatusDto.status}`,
      );
    }

    const updatingUser = await this.userRepository.findOne({
      where: { id: userId },
    });

    asset.status = updateStatusDto.status;
    asset.updatedBy = updatingUser;

    const updatedAsset = await this.assetRepository.save(asset);

    this.logger.log(
      `Asset status updated: ${updatedAsset.assetId} to ${updateStatusDto.status} by user ${userId}`,
    );

    return this.findOne(updatedAsset.id);
  }

  async remove(id: string, userId: string): Promise<void> {
    const asset = await this.findOne(id);

    if (asset.assignedTo) {
      throw new BadRequestException(
        'Cannot delete an asset that is currently assigned. Please unassign it first.',
      );
    }

    await this.assetRepository.softDelete(id);

    this.logger.log(`Asset soft deleted: ${asset.assetId} by user ${userId}`);
  }

  async bulkCreate(
    bulkCreateDto: BulkCreateAssetDto,
    userId: string,
  ): Promise<{ created: Asset[]; failed: any[] }> {
    const created: Asset[] = [];
    const failed: any[] = [];

    for (const [index, assetDto] of bulkCreateDto.assets.entries()) {
      try {
        const asset = await this.create(assetDto, userId);
        created.push(asset);
      } catch (error) {
        failed.push({
          index,
          asset: assetDto,
          error: error.message,
        });
      }
    }

    this.logger.log(
      `Bulk create completed: ${created.length} created, ${failed.length} failed`,
    );

    return { created, failed };
  }

  async bulkUpdate(
    bulkUpdateDto: BulkUpdateAssetDto,
    userId: string,
  ): Promise<{ updated: Asset[]; failed: any[] }> {
    const updated: Asset[] = [];
    const failed: any[] = [];

    for (const id of bulkUpdateDto.ids) {
      try {
        const asset = await this.update(id, bulkUpdateDto.data, userId);
        updated.push(asset);
      } catch (error) {
        failed.push({
          id,
          error: error.message,
        });
      }
    }

    this.logger.log(
      `Bulk update completed: ${updated.length} updated, ${failed.length} failed`,
    );

    return { updated, failed };
  }

  async bulkDelete(
    bulkDeleteDto: BulkDeleteAssetDto,
    userId: string,
  ): Promise<{ deleted: string[]; failed: any[] }> {
    const deleted: string[] = [];
    const failed: any[] = [];

    for (const id of bulkDeleteDto.ids) {
      try {
        await this.remove(id, userId);
        deleted.push(id);
      } catch (error) {
        failed.push({
          id,
          error: error.message,
        });
      }
    }

    this.logger.log(
      `Bulk delete completed: ${deleted.length} deleted, ${failed.length} failed`,
    );

    return { deleted, failed };
  }

  private async generateAssetId(): Promise<string> {
    const prefix = process.env.ASSET_ID_PREFIX || 'AST';
    const startNumber = parseInt(process.env.ASSET_ID_START || '1000', 10);

    const lastAsset = await this.assetRepository.findOne({
      where: {},
      order: { createdAt: 'DESC' },
    });

    let nextNumber = startNumber;
    if (lastAsset && lastAsset.assetId.startsWith(prefix)) {
      const lastNumber = parseInt(lastAsset.assetId.replace(prefix, ''), 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    return `${prefix}${nextNumber}`;
  }

  private calculateCurrentValue(
    purchasePrice: number,
    purchaseDate: string,
    category: AssetCategory,
  ): number {
    if (!purchasePrice || !purchaseDate) {
      return purchasePrice || 0;
    }

    const depreciationRate = (category as any).depreciationRate || 0;
    
    if (!depreciationRate) {
      return purchasePrice;
    }

    const purchase = new Date(purchaseDate);
    const now = new Date();
    const yearsElapsed =
      (now.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    const annualDepreciation = purchasePrice * (depreciationRate / 100);
    const totalDepreciation = annualDepreciation * yearsElapsed;
    const currentValue = purchasePrice - totalDepreciation;
    
    return Math.max(currentValue, 0);
  }
}