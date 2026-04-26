import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from './asset.entity';
import { AssetHistory } from './asset-history.entity';
import { AssetNote } from './asset-note.entity';
import { Maintenance } from './maintenance.entity';
import { AssetDocument } from './asset-document.entity';
import { User } from '../users/user.entity';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetFiltersDto } from './dto/asset-filters.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { TransferAssetDto } from './dto/transfer-asset.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { AssetHistoryAction } from './enums';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
    @InjectRepository(AssetHistory)
    private readonly historyRepo: Repository<AssetHistory>,
    @InjectRepository(AssetNote)
    private readonly noteRepo: Repository<AssetNote>,
    @InjectRepository(Maintenance)
    private readonly maintenanceRepo: Repository<Maintenance>,
    @InjectRepository(AssetDocument)
    private readonly documentRepo: Repository<AssetDocument>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private async generateAssetId(): Promise<string> {
    const result = await this.assetRepo
      .createQueryBuilder('asset')
      .select("MAX(CAST(SUBSTRING(asset.assetId, 5) AS INTEGER))", 'max')
      .where("asset.assetId LIKE 'AST-%'")
      .getRawOne<{ max: string | null }>();

    const max = result?.max ? parseInt(result.max, 10) : 1000;
    return `AST-${max + 1}`;
  }

  async create(dto: CreateAssetDto, createdBy: string): Promise<Asset> {
    const assetId = await this.generateAssetId();

    const asset = this.assetRepo.create({
      ...dto,
      assetId,
      createdBy,
    });

    const saved = await this.assetRepo.save(asset);

    const history = this.historyRepo.create({
      asset: saved,
      action: AssetHistoryAction.CREATED,
      changes: null,
      performedBy: createdBy,
    });
    await this.historyRepo.save(history);

    return this.assetRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ['history'],
    });
  }

  async findAll(filters: AssetFiltersDto): Promise<{ data: Asset[]; total: number; page: number; limit: number }> {
    const { search, status, condition, categoryId, departmentId, page = 1, limit = 20 } = filters;
    const qb = this.assetRepo.createQueryBuilder('asset')
      .leftJoinAndSelect('asset.history', 'history')
      .where('asset.deletedAt IS NULL');

    if (search) {
      const term = `%${search}%`;
      qb.andWhere(
        `(asset.name ILIKE :term OR asset.assetId ILIKE :term OR asset.serialNumber ILIKE :term OR asset.manufacturer ILIKE :term OR asset.model ILIKE :term)`,
        { term },
      );
    }

    if (status) {
      qb.andWhere('asset.status = :status', { status });
    }

    if (condition) {
      qb.andWhere('asset.condition = :condition', { condition });
    }

    if (categoryId) {
      qb.andWhere('asset.categoryId = :categoryId', { categoryId });
    }

    if (departmentId) {
      qb.andWhere('asset.departmentId = :departmentId', { departmentId });
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({
      where: { id },
      relations: ['history'],
      withDeleted: true,
    });
    if (!asset) {
      throw new NotFoundException(`Asset with id "${id}" not found`);
    }
    return asset;
  }

  async update(id: string, dto: UpdateAssetDto, performedBy: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({
      where: { id },
      relations: ['history'],
    });
    if (!asset) {
      throw new NotFoundException(`Asset with id "${id}" not found`);
    }

    const changes: Record<string, unknown> = {};
    for (const key of Object.keys(dto)) {
      const k = key as keyof UpdateAssetDto;
      if (dto[k] !== undefined && asset[k] !== dto[k]) {
        changes[k] = { old: asset[k], new: dto[k] };
        (asset as unknown as Record<string, unknown>)[k] = dto[k];
      }
    }

    const updated = await this.assetRepo.save(asset);

    if (Object.keys(changes).length > 0) {
      const history = this.historyRepo.create({
        asset: updated,
        action: AssetHistoryAction.UPDATED,
        changes,
        performedBy,
      });
      await this.historyRepo.save(history);
    }

    return updated;
  }

  async softDelete(id: string, performedBy: string): Promise<void> {
    const asset = await this.assetRepo.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`Asset with id "${id}" not found`);
    }

    await this.assetRepo.softDelete(id);

    const history = this.historyRepo.create({
      asset,
      action: AssetHistoryAction.DELETED,
      changes: null,
      performedBy,
    });
    await this.historyRepo.save(history);
  }

  async restore(id: string, performedBy: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!asset) {
      throw new NotFoundException(`Asset with id "${id}" not found`);
    }

    await this.assetRepo.restore(id);

    const restored = await this.assetRepo.findOneOrFail({ where: { id } });

    const history = this.historyRepo.create({
      asset: restored,
      action: AssetHistoryAction.RESTORED,
      changes: null,
      performedBy,
    });
    await this.historyRepo.save(history);

    return restored;
  }

  // ── BE-25: Status update & transfer ─────────────────────────────────────────

  async updateStatus(id: string, dto: UpdateStatusDto, performedBy: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({ where: { id }, relations: ['history'] });
    if (!asset) throw new NotFoundException(`Asset with id "${id}" not found`);

    const oldStatus = asset.status;
    asset.status = dto.status;
    const updated = await this.assetRepo.save(asset);

    await this.historyRepo.save(
      this.historyRepo.create({
        asset: updated,
        action: AssetHistoryAction.STATUS_CHANGED,
        changes: { status: { old: oldStatus, new: dto.status } },
        performedBy,
      }),
    );

    return this.assetRepo.findOneOrFail({ where: { id }, relations: ['history'] });
  }

  async transfer(id: string, dto: TransferAssetDto, performedBy: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({ where: { id }, relations: ['history'] });
    if (!asset) throw new NotFoundException(`Asset with id "${id}" not found`);

    if (dto.assignedToId) {
      const user = await this.userRepo.findOne({ where: { id: dto.assignedToId } });
      if (!user) throw new BadRequestException(`User with id "${dto.assignedToId}" not found`);
    }

    const changes: Record<string, unknown> = {
      departmentId: { old: asset.departmentId, new: dto.departmentId },
    };

    asset.departmentId = dto.departmentId;
    if (dto.assignedToId !== undefined) {
      changes['assignedToId'] = { old: asset.assignedToId, new: dto.assignedToId };
      asset.assignedToId = dto.assignedToId;
    }
    if (dto.location !== undefined) {
      changes['location'] = { old: asset.location, new: dto.location };
      asset.location = dto.location;
    }

    const updated = await this.assetRepo.save(asset);

    await this.historyRepo.save(
      this.historyRepo.create({
        asset: updated,
        action: AssetHistoryAction.TRANSFERRED,
        changes: { ...changes, notes: dto.notes ?? null },
        performedBy,
      }),
    );

    return this.assetRepo.findOneOrFail({ where: { id }, relations: ['history'] });
  }

  // ── BE-26: History & notes ───────────────────────────────────────────────────

  async getHistory(id: string): Promise<AssetHistory[]> {
    await this.findOne(id);
    return this.historyRepo.find({
      where: { asset: { id } },
      order: { createdAt: 'DESC' },
    });
  }

  async getNotes(id: string): Promise<AssetNote[]> {
    await this.findOne(id);
    return this.noteRepo.find({ where: { assetId: id } });
  }

  async createNote(id: string, dto: CreateNoteDto, userId: string): Promise<AssetNote> {
    const asset = await this.findOne(id);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User with id "${userId}" not found`);

    const note = this.noteRepo.create({ assetId: id, content: dto.content, createdBy: user });
    const saved = await this.noteRepo.save(note);

    await this.historyRepo.save(
      this.historyRepo.create({
        asset,
        action: AssetHistoryAction.NOTE_ADDED,
        changes: { noteId: saved.id },
        performedBy: userId,
      }),
    );

    return saved;
  }

  async deleteNote(assetId: string, noteId: string): Promise<void> {
    await this.findOne(assetId);
    const note = await this.noteRepo.findOne({ where: { id: noteId, assetId } });
    if (!note) throw new NotFoundException(`Note with id "${noteId}" not found`);
    await this.noteRepo.remove(note);
  }

  // ── BE-27: Maintenance & documents ──────────────────────────────────────────

  async getMaintenance(assetId: string): Promise<Maintenance[]> {
    await this.findOne(assetId);
    return this.maintenanceRepo.find({ where: { assetId } });
  }

  async createMaintenance(assetId: string, dto: CreateMaintenanceDto, performedBy: string): Promise<Maintenance> {
    const asset = await this.findOne(assetId);

    const record = this.maintenanceRepo.create({
      assetId,
      type: dto.type,
      description: dto.description,
      scheduledDate: new Date(dto.scheduledDate),
      notes: dto.notes ?? null,
      cost: dto.cost ?? null,
      performedBy,
    });
    const saved = await this.maintenanceRepo.save(record);

    await this.historyRepo.save(
      this.historyRepo.create({
        asset,
        action: AssetHistoryAction.UPDATED,
        changes: { maintenanceId: saved.id, type: dto.type },
        performedBy,
      }),
    );

    return saved;
  }

  async updateMaintenance(assetId: string, maintenanceId: string, dto: UpdateMaintenanceDto): Promise<Maintenance> {
    await this.findOne(assetId);
    const record = await this.maintenanceRepo.findOne({ where: { id: maintenanceId, assetId } });
    if (!record) throw new NotFoundException(`Maintenance record "${maintenanceId}" not found`);

    if (dto.status !== undefined) record.status = dto.status;
    if (dto.completedDate !== undefined) record.completedDate = new Date(dto.completedDate);
    if (dto.cost !== undefined) record.cost = dto.cost;
    if (dto.notes !== undefined) record.notes = dto.notes;

    return this.maintenanceRepo.save(record);
  }

  async getDocuments(assetId: string): Promise<AssetDocument[]> {
    await this.findOne(assetId);
    return this.documentRepo.find({ where: { assetId } });
  }

  async createDocument(assetId: string, dto: CreateDocumentDto, userId: string): Promise<AssetDocument> {
    const asset = await this.findOne(assetId);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User with id "${userId}" not found`);

    const doc = this.documentRepo.create({
      assetId,
      name: dto.name,
      url: dto.url,
      type: dto.type ?? '',
      size: dto.size ?? 0,
      uploadedBy: user,
    });
    const saved = await this.documentRepo.save(doc);

    await this.historyRepo.save(
      this.historyRepo.create({
        asset,
        action: AssetHistoryAction.DOCUMENT_UPLOADED,
        changes: { documentId: saved.id, name: dto.name },
        performedBy: userId,
      }),
    );

    return saved;
  }

  async deleteDocument(assetId: string, documentId: string): Promise<void> {
    await this.findOne(assetId);
    const doc = await this.documentRepo.findOne({ where: { id: documentId, assetId } });
    if (!doc) throw new NotFoundException(`Document with id "${documentId}" not found`);
    await this.documentRepo.remove(doc);
  }

  // ── BE-28: QR & Barcode ──────────────────────────────────────────────────────

  async generateQrCode(id: string): Promise<Buffer> {
    const asset = await this.findOne(id);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const QRCode = require('qrcode') as typeof import('qrcode');
    const buffer = await QRCode.toBuffer(asset.assetId ?? id, { type: 'png' });
    return buffer;
  }

  async generateBarcode(id: string): Promise<Buffer> {
    const asset = await this.findOne(id);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bwipjs = require('bwip-js') as typeof import('bwip-js');
    const buffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: asset.assetId ?? id,
      scale: 3,
      height: 10,
      includetext: true,
    });
    return buffer;
  }
}

