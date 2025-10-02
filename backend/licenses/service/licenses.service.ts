import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { License } from '../entities/license.entity';
import { CreateLicenseDto } from '../dto/create-license.dto';
import { LessThan } from 'typeorm';
import { addDays } from 'date-fns';

@Injectable()
export class LicensesService {
  constructor(
    @InjectRepository(License)
    private readonly licenseRepository: Repository<License>,
  ) {}

  async create(createDto: CreateLicenseDto): Promise<License> {
    const license = this.licenseRepository.create(createDto);
    return this.licenseRepository.save(license);
  }

  async findAllForAsset(assetId: string): Promise<License[]> {
    return this.licenseRepository.find({ where: { assetId } });
  }

  async findOne(id: string): Promise<License> {
    const license = await this.licenseRepository.findOne({ where: { id } });
    if (!license) {
      throw new NotFoundException(`License with ID "${id}" not found.`);
    }
    return license;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const result = await this.licenseRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`License with ID "${id}" not found.`);
    }
    return { deleted: true };
  }

  /**
   * Finds all licenses that will expire within the next 30 days and have not been notified yet.
   */
  async findLicensesNearingExpiry(): Promise<License[]> {
    const thirtyDaysFromNow = addDays(new Date(), 30);
    return this.licenseRepository.find({
      where: {
        expiryDate: LessThanOrEqual(thirtyDaysFromNow),
        isExpiryNotified: false,
      },
    });
  }

  async markAsNotified(licenseIds: string[]): Promise<void> {
    if (licenseIds.length === 0) return;
    await this.licenseRepository.update(licenseIds, { isExpiryNotified: true });
  }
}
