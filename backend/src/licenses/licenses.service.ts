import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { License } from './entities/license.entity';
import { LicenseSeatAssignment } from './entities/license-seat-assignment.entity';
import { CreateLicenseDto } from './dto/create-license.dto';
import { UpdateLicenseDto } from './dto/update-license.dto';

const RENEWAL_WARNING_DAYS = 30;

@Injectable()
export class LicensesService {
  constructor(
    @InjectRepository(License)
    private readonly licenseRepo: Repository<License>,
    @InjectRepository(LicenseSeatAssignment)
    private readonly seatRepo: Repository<LicenseSeatAssignment>,
    private readonly dataSource: DataSource,
  ) {}

  private withRenewalFlag(license: License) {
    let renewsSoon = false;
    if (license.expiryDate) {
      const days = Math.ceil(
        (new Date(license.expiryDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      );
      renewsSoon = days >= 0 && days <= RENEWAL_WARNING_DAYS;
    }
    return { ...license, renewsSoon };
  }

  async findAll() {
    const licenses = await this.licenseRepo.find();
    return licenses.map((l) => this.withRenewalFlag(l));
  }

  async findById(id: string) {
    const lic = await this.licenseRepo.findOne({ where: { id } });
    if (!lic) throw new NotFoundException(`License ${id} not found`);
    return this.withRenewalFlag(lic);
  }

  async create(dto: CreateLicenseDto) {
    const lic = this.licenseRepo.create(dto);
    const saved = await this.licenseRepo.save(lic);
    return this.findById(saved.id);
  }

  async update(id: string, dto: UpdateLicenseDto) {
    const lic = await this.licenseRepo.findOne({ where: { id } });
    if (!lic) throw new NotFoundException(`License ${id} not found`);
    if (dto.seatsTotal !== undefined && dto.seatsTotal < lic.seatsUsed) {
      throw new BadRequestException(
        `Cannot reduce total seats below the ${lic.seatsUsed} seat(s) currently assigned`,
      );
    }
    Object.assign(lic, dto);
    await this.licenseRepo.save(lic);
    return this.findById(id);
  }

  async delete(id: string) {
    const lic = await this.licenseRepo.findOne({ where: { id } });
    if (!lic) throw new NotFoundException(`License ${id} not found`);
    return this.licenseRepo.remove(lic);
  }

  /** Returns the plaintext license key — only ever called from the explicit reveal action. */
  async revealKey(id: string): Promise<{ licenseKey: string }> {
    const lic = await this.licenseRepo
      .createQueryBuilder('license')
      .addSelect('license.licenseKey')
      .where('license.id = :id', { id })
      .getOne();
    if (!lic) throw new NotFoundException(`License ${id} not found`);
    return { licenseKey: lic.licenseKey };
  }

  async getAssignments(licenseId: string) {
    await this.findById(licenseId);
    return this.seatRepo.find({
      where: { licenseId, unassignedAt: IsNull() },
      order: { assignedAt: 'ASC' },
    });
  }

  async assign(licenseId: string, dto: { userId: string }) {
    return this.dataSource.transaction(async (manager) => {
      // Pessimistic write lock prevents concurrent over-allocation
      const lic = await manager.findOne(License, {
        where: { id: licenseId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lic) throw new NotFoundException(`License ${licenseId} not found`);

      if (lic.seatsUsed >= lic.seatsTotal) {
        throw new ConflictException(
          'No available seats remaining for this license',
        );
      }

      const existing = await manager.findOne(LicenseSeatAssignment, {
        where: { licenseId, userId: dto.userId, unassignedAt: IsNull() },
      });
      if (existing) {
        throw new ConflictException(
          'This user already holds a seat for this license',
        );
      }

      const assignment = manager.create(LicenseSeatAssignment, {
        licenseId,
        userId: dto.userId,
      });
      await manager.save(assignment);
      lic.seatsUsed += 1;
      await manager.save(lic);
    }).then(() => this.findById(licenseId));
  }

  async unassign(licenseId: string, assignmentId: string) {
    const lic = await this.licenseRepo.findOne({ where: { id: licenseId } });
    if (!lic) throw new NotFoundException(`License ${licenseId} not found`);

    const assignment = await this.seatRepo.findOne({
      where: { id: assignmentId, licenseId, unassignedAt: IsNull() },
    });
    if (!assignment)
      throw new NotFoundException('Active seat assignment not found');

    assignment.unassignedAt = new Date();
    await this.seatRepo.save(assignment);
    lic.seatsUsed = Math.max(0, lic.seatsUsed - 1);
    await this.licenseRepo.save(lic);
    return this.findById(licenseId);
  }
}