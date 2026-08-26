import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AssetTransfer,
  TransferStatus,
} from './entities/asset-transfer.entity';
import { Asset } from '../assets/entities/asset.entity';

@Injectable()
export class TransfersService {
  constructor(
    @InjectRepository(AssetTransfer)
    private readonly transferRepo: Repository<AssetTransfer>,
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
  ) {}

  async findAll() {
    return this.transferRepo.find();
  }

  async findById(id: string) {
    const tr = await this.transferRepo.findOne({ where: { id } });
    if (!tr) throw new NotFoundException(`Transfer ${id} not found`);
    return tr;
  }

  async create(dto: Partial<AssetTransfer>) {
    const tr = this.transferRepo.create({
      ...dto,
      status: TransferStatus.PENDING,
    });
    return this.transferRepo.save(tr);
  }

  async approve(id: string, approverUserId: string) {
    const tr = await this.findById(id);
    if (tr.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Only pending transfers can be approved');
    }

    await this.transferRepo.manager.transaction(async (manager) => {
      tr.status = TransferStatus.APPROVED;
      tr.approvedByUserId = approverUserId;
      await manager.save(tr);

      const asset = await manager.findOneBy(Asset, { id: tr.assetId });
      if (asset) {
        asset.departmentId = tr.toDepartmentId;
        await manager.save(asset);
      }
    });

    return this.findById(id);
  }

  async reject(id: string, reason: string) {
    const tr = await this.findById(id);
    if (tr.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Only pending transfers can be rejected');
    }
    tr.status = TransferStatus.REJECTED;
    tr.rejectionReason = reason;
    return this.transferRepo.save(tr);
  }

  async cancel(id: string) {
    const tr = await this.findById(id);
    if (tr.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Only pending transfers can be cancelled');
    }
    tr.status = TransferStatus.CANCELLED;
    return this.transferRepo.save(tr);
  }

  async complete(id: string) {
    const tr = await this.findById(id);
    if (tr.status !== TransferStatus.APPROVED) {
      throw new BadRequestException(
        'Only approved transfers can be completed',
      );
    }
    tr.status = TransferStatus.COMPLETED;
    return this.transferRepo.save(tr);
  }
}
