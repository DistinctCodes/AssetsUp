import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MaintenanceRecord,
  MaintenanceStatus,
} from './entities/maintenance-record.entity';
import { AssetsService } from '../assets/assets.service';
import {
  AssetStatus,
  AssetStatusInput,
} from '../assets/asset-lifecycle.service';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { UpdateMaintenanceRecordDto } from './dto/update-maintenance-record.dto';

export interface MaintenanceQuery {
  assetId?: string;
  status?: string;
  type?: string;
  departmentId?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenanceRecord)
    private readonly maintenanceRepo: Repository<MaintenanceRecord>,
    private readonly assetsService: AssetsService,
  ) {}

  async findAll(query?: MaintenanceQuery) {
    const qb = this.maintenanceRepo.createQueryBuilder('record');

    if (query?.departmentId) {
      qb.innerJoin('assets', 'asset', 'asset.id = record.assetId').andWhere(
        'asset.departmentId = :departmentId',
        { departmentId: query.departmentId },
      );
    }
    if (query?.assetId)
      qb.andWhere('record.assetId = :assetId', { assetId: query.assetId });
    if (query?.status)
      qb.andWhere('record.status = :status', { status: query.status });
    if (query?.type) qb.andWhere('record.type = :type', { type: query.type });
    if (query?.from)
      qb.andWhere('record.scheduledDate >= :from', { from: query.from });
    if (query?.to) qb.andWhere('record.scheduledDate <= :to', { to: query.to });

    qb.orderBy('record.scheduledDate', 'ASC');
    return qb.getMany();
  }

  async findById(id: string) {
    const record = await this.maintenanceRepo.findOne({ where: { id } });
    if (!record)
      throw new NotFoundException(`Maintenance record ${id} not found`);
    return record;
  }

  async create(dto: CreateMaintenanceRecordDto, assetIdFromParam?: string) {
    const assetId = assetIdFromParam ?? dto.assetId;
    if (!assetId) throw new BadRequestException('assetId is required');

    // An unknown asset is a 404 from findById; maintenance on a disposed asset makes no sense.
    const asset = await this.assetsService.findById(assetId);
    if (asset.status === AssetStatus.DISPOSED) {
      throw new BadRequestException(
        'Cannot schedule maintenance for a disposed asset',
      );
    }

    const record = this.maintenanceRepo.create({
      ...dto,
      assetId,
      title: dto.title || dto.description || 'Maintenance',
      scheduledDate: dto.scheduledDate
        ? new Date(dto.scheduledDate)
        : undefined,
    });
    return this.maintenanceRepo.save(record);
  }

  async update(id: string, dto: UpdateMaintenanceRecordDto) {
    const record = await this.findById(id);
    // A status change must also move the asset, so it goes through updateStatus.
    const { status, ...fields } = dto;
    if (status && status !== record.status) {
      await this.updateStatus(id, status);
      return this.update(id, fields);
    }
    Object.assign(record, fields, {
      scheduledDate: dto.scheduledDate
        ? new Date(dto.scheduledDate)
        : record.scheduledDate,
      completedDate: dto.completedDate
        ? new Date(dto.completedDate)
        : record.completedDate,
    });
    return this.maintenanceRepo.save(record);
  }

  /**
   * Changes a record's status and keeps the asset's own status in step:
   * starting maintenance moves the asset to IN_MAINTENANCE, and finishing
   * (COMPLETED or CANCELLED) moves it back unless another record on the same
   * asset is still in progress. `assetId`, when given (the nested route),
   * must match the record's asset, otherwise the record is reported as not found.
   */
  async updateStatus(id: string, status: MaintenanceStatus, assetId?: string) {
    const record = await this.findById(id);
    if (assetId && record.assetId !== assetId) {
      throw new NotFoundException(
        `Maintenance record ${id} not found for asset ${assetId}`,
      );
    }

    const wasInProgress = record.status === MaintenanceStatus.IN_PROGRESS;

    // Move the asset first: if its lifecycle rules refuse (for example a lost
    // asset), the record is left untouched and the caller sees the 400.
    if (status === MaintenanceStatus.IN_PROGRESS && !wasInProgress) {
      await this.setAssetStatus(record.assetId, AssetStatus.IN_MAINTENANCE);
    }

    record.status = status;
    if (status === MaintenanceStatus.COMPLETED && !record.completedDate) {
      record.completedDate = new Date();
    }
    const saved = await this.maintenanceRepo.save(record);

    const finished =
      status === MaintenanceStatus.COMPLETED ||
      status === MaintenanceStatus.CANCELLED;
    if (wasInProgress && finished) {
      await this.restoreAssetStatus(record.assetId, record.id);
    }
    return saved;
  }

  private async setAssetStatus(assetId: string, status: AssetStatus) {
    const asset = await this.assetsService.findById(assetId);
    if (asset.status === status) return;
    await this.assetsService.updateStatus(assetId, {
      status: AssetStatusInput[status as keyof typeof AssetStatusInput],
      reason: 'Maintenance status changed',
    });
  }

  /**
   * Puts the asset back where it was before maintenance: ASSIGNED if it still
   * has an assignee, otherwise AVAILABLE. Does nothing if the asset has moved
   * on (for example retired) or another record keeps it in maintenance.
   */
  private async restoreAssetStatus(assetId: string, finishedRecordId: string) {
    const stillInProgress = await this.maintenanceRepo
      .createQueryBuilder('record')
      .where('record.assetId = :assetId', { assetId })
      .andWhere('record.status = :status', {
        status: MaintenanceStatus.IN_PROGRESS,
      })
      .andWhere('record.id != :id', { id: finishedRecordId })
      .getCount();
    if (stillInProgress > 0) return;

    const asset = await this.assetsService.findById(assetId);
    if (asset.status !== AssetStatus.IN_MAINTENANCE) return;

    await this.setAssetStatus(
      assetId,
      asset.assignedToUserId ? AssetStatus.ASSIGNED : AssetStatus.AVAILABLE,
    );
  }
}
