import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { License } from './entities/license.entity';
import { CreateLicenseDto } from './dtos/create-license.dto';
import { UpdateLicenseDto } from './dtos/update-license.dto';
import { LicenseQueryDto } from './dtos/license-query.dto';

@Injectable()
export class LicensesService {
  constructor(
    @InjectRepository(License)
    private readonly licenseRepository: Repository<License>,
  ) {}

  async create(dto: CreateLicenseDto, userId?: string): Promise<License> {
    const licenseKey = `LIC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const license = this.licenseRepository.create({
      ...dto,
      licenseKey,
      createdById: userId,
    });
    return this.licenseRepository.save(license);
  }

  async findAll(
    query: LicenseQueryDto,
  ): Promise<{ data: License[]; total: number }> {
    const { search, status, vendor, page, limit } = query;
    const qb = this.licenseRepository
      .createQueryBuilder('license')
      .leftJoinAndSelect('license.assignedTo', 'assignedTo')
      .leftJoinAndSelect('license.createdBy', 'createdBy');

    if (search) {
      qb.andWhere(
        '(license.name ILIKE :search OR license.softwareName ILIKE :search OR license.vendor ILIKE :search OR license.licenseKey ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (status) qb.andWhere('license.status = :status', { status });
    if (vendor)
      qb.andWhere('license.vendor ILIKE :vendor', { vendor: `%${vendor}%` });

    qb.orderBy('license.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);
    return qb.getManyAndCount().then(([data, total]) => ({ data, total }));
  }

  async findById(id: string): Promise<License> {
    const license = await this.licenseRepository.findOne({
      where: { id },
      relations: ['assignedTo', 'createdBy'],
    });
    if (!license) throw new NotFoundException('License not found');
    return license;
  }

  async update(
    id: string,
    dto: UpdateLicenseDto,
    _userId?: string,
  ): Promise<License> {
    const license = await this.findById(id);
    Object.assign(license, dto);
    return this.licenseRepository.save(license);
  }

  async remove(id: string): Promise<void> {
    const license = await this.findById(id);
    await this.licenseRepository.softDelete(license.id);
  }
}
