import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckinRecord } from './checkin.entity';
import { Asset } from '../assets/entities/asset.entity';
import { CheckoutDto } from './dtos/checkout.dto';
import { CheckinDto } from './dtos/checkin.dto';

@Injectable()
export class CheckinService {
  constructor(
    @InjectRepository(CheckinRecord)
    private readonly checkinRepository: Repository<CheckinRecord>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  async checkout(dto: CheckoutDto, userId?: string): Promise<CheckinRecord> {
    const asset = await this.assetRepository.findOne({
      where: { id: dto.assetId },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    const active = await this.checkinRepository.findOne({
      where: { assetId: dto.assetId, status: 'CHECKED_OUT' },
    });
    if (active) throw new BadRequestException('Asset is already checked out');

    const record = this.checkinRepository.create({
      assetId: dto.assetId,
      assignedToId: dto.assignedToId,
      checkedOutById: userId,
      checkedOutAt: new Date(),
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      notes: dto.notes,
      status: 'CHECKED_OUT',
    });
    await this.checkinRepository.save(record);

    await this.assetRepository.update(dto.assetId, {
      status: 'ASSIGNED',
      assignedToId: dto.assignedToId,
      updatedById: userId,
    });

    return record;
  }

  async checkin(dto: CheckinDto, userId?: string): Promise<CheckinRecord> {
    const active = await this.checkinRepository.findOne({
      where: { assetId: dto.assetId, status: 'CHECKED_OUT' },
      order: { checkedOutAt: 'DESC' },
    });
    if (!active) throw new BadRequestException('Asset is not checked out');

    active.checkedInAt = new Date();
    active.checkedInById = userId;
    active.status = 'CHECKED_IN';
    if (dto.notes) active.notes = dto.notes;
    await this.checkinRepository.save(active);

    await this.assetRepository.update(dto.assetId, {
      status: 'ACTIVE',
      assignedToId: null,
      updatedById: userId,
    });

    return active;
  }

  async getActiveCheckouts() {
    return this.checkinRepository.find({
      where: { status: 'CHECKED_OUT' },
      relations: ['assignedTo', 'checkedOutBy'],
      order: { checkedOutAt: 'DESC' },
    });
  }

  async getAssetHistory(assetId: string) {
    return this.checkinRepository.find({
      where: { assetId },
      relations: ['assignedTo', 'checkedOutBy', 'checkedInBy'],
      order: { checkedOutAt: 'DESC' },
    });
  }
}
