import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { License } from './entities/license.entity';

@Injectable()
export class LicensesService {
  constructor(
    @InjectRepository(License)
    private readonly licenseRepo: Repository<License>,
  ) {}

  async findAll() {
    return this.licenseRepo.find();
  }

  async findById(id: string) {
    const lic = await this.licenseRepo.findOne({ where: { id } });
    if (!lic) throw new NotFoundException(`License ${id} not found`);
    return lic;
  }

  async create(dto: Partial<License>) {
    const lic = this.licenseRepo.create(dto);
    return this.licenseRepo.save(lic);
  }

  async assign(id: string, userIdOrAssetId: string) {
    const lic = await this.findById(id);
    if (lic.seatsUsed >= lic.seatsTotal) {
      throw new ConflictException(
        'No available seats remaining for this license',
      );
    }
    lic.seatsUsed += 1;
    return this.licenseRepo.save(lic);
  }
}
