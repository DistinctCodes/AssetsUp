import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import { CreateVendorDto } from './dtos/create-vendor.dto';
import { UpdateVendorDto } from './dtos/update-vendor.dto';

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
  ) {}

  async create(dto: CreateVendorDto): Promise<Vendor> {
    const vendor = this.vendorRepository.create(dto);
    return this.vendorRepository.save(vendor);
  }

  async findAll(query: { page?: number; limit?: number; isActive?: boolean; search?: string } = {}): Promise<{ data: Vendor[]; total: number }> {
    const { page = 1, limit = 20, isActive, search } = query;
    const qb = this.vendorRepository.createQueryBuilder('vendor')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('vendor.createdAt', 'DESC');

    if (isActive !== undefined) qb.andWhere('vendor.isActive = :isActive', { isActive });
    if (search) {
      qb.andWhere(
        '(vendor.name ILIKE :search OR vendor.email ILIKE :search OR vendor.contactPerson ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findById(id: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({ where: { id } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async update(id: string, dto: UpdateVendorDto): Promise<Vendor> {
    const vendor = await this.findById(id);
    Object.assign(vendor, dto);
    return this.vendorRepository.save(vendor);
  }

  async remove(id: string): Promise<void> {
    const vendor = await this.findById(id);
    await this.vendorRepository.softDelete(vendor.id);
  }
}
