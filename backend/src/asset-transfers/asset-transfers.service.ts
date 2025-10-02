import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetTransfer } from './entities/asset-transfer.entity';
import { InitiateTransferDto } from './dto/initiate-transfer.dto';
import { InventoryItem } from 'src/inventory/entities/inventory-item.entity';

@Injectable()
export class AssetTransfersService {
  constructor(
    @InjectRepository(AssetTransfer)
    private readonly transferRepository: Repository<AssetTransfer>,
    @InjectRepository(InventoryItem)
    private readonly inventoryRepository: Repository<InventoryItem>,
  ) {}

  async initiateTransfer(dto: InitiateTransferDto): Promise<AssetTransfer> {
    const asset = await this.inventoryRepository.findOne({
      where: { id: dto.assetId },
    });
    if (!asset) {
      throw new NotFoundException(`Asset ${dto.assetId} not found`);
    }

    // Capture original department before update
    const previousDepartmentId = (asset as any).currentDepartmentId ?? null;

    // Update asset ownership (department)
    (asset as any).currentDepartmentId = dto.toDepartmentId;
    await this.inventoryRepository.save(asset);

    const transfer = this.transferRepository.create({
      assetId: dto.assetId,
      fromDepartmentId: dto.fromDepartmentId ?? previousDepartmentId,
      toDepartmentId: dto.toDepartmentId,
      transferDate: new Date(),
      initiatedBy: dto.initiatedBy,
      reason: dto.reason,
    });
    return await this.transferRepository.save(transfer);
  }
}
