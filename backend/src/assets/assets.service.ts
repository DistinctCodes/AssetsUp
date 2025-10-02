import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Asset } from './entities/assest.entity';
import { Department } from 'src/departments/department.entity';
import { AssetCategory } from 'src/asset-categories/asset-category.entity';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private assetsRepo: Repository<Asset>,
    @InjectRepository(Supplier)
    private supplierRepo: Repository<Supplier>,
    @InjectRepository(Department)
    private departmentRepo: Repository<Department>,
    @InjectRepository(AssetCategory)
    private categoryRepo: Repository<AssetCategory>,
  ) {}

  async create(dto: CreateAssetDto): Promise<Asset> {
    const supplier = await this.supplierRepo.findOneBy({ id: dto.supplierId });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const category = await this.categoryRepo.findOneBy({ id: dto.categoryId });
    if (!category) throw new NotFoundException('Category not found');

    let department: Department = null;
    if (dto.assignedDepartmentId) {
      department = await this.departmentRepo.findOneBy({
        id: dto.assignedDepartmentId,
      });
      if (!department) throw new NotFoundException('Department not found');
    }

    const asset = this.assetsRepo.create({
      ...dto,
      purchaseDate: new Date(dto.purchaseDate),
      warrantyEnd: dto.warrantyEnd ? new Date(dto.warrantyEnd) : null,
      supplier,
      category,
      assignedDepartment: department,
    });

    return this.assetsRepo.save(asset);
  }

  async findAll(): Promise<Asset[]> {
    return this.assetsRepo.find({
      relations: ['supplier', 'category', 'assignedDepartment'],
    });
  }

  async findOne(id: number): Promise<Asset> {
    const asset = await this.assetsRepo.findOne({
      where: { id },
      relations: ['supplier', 'category', 'assignedDepartment'],
    });
    if (!asset) throw new NotFoundException(`Asset with ID ${id} not found`);
    return asset;
  }

  async update(id: number, dto: UpdateAssetDto): Promise<Asset> {
    const asset = await this.findOne(id);

    if (dto.supplierId) {
      asset.supplier = await this.supplierRepo.findOneBy({
        id: dto.supplierId,
      });
    }
    if (dto.categoryId) {
      asset.category = await this.categoryRepo.findOneBy({
        id: dto.categoryId,
      });
    }
    if (dto.assignedDepartmentId) {
      asset.assignedDepartment = await this.departmentRepo.findOneBy({
        id: dto.assignedDepartmentId,
      });
    }

    Object.assign(asset, dto);
    return this.assetsRepo.save(asset);
  }

  async remove(id: number): Promise<void> {
    const asset = await this.findOne(id);
    await this.assetsRepo.remove(asset);
  }
}
