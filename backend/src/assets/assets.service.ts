import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Asset } from './asset.entity';
import { AssetHistory } from './asset-history.entity';
import { AssetNote } from './asset-note.entity';
import { Maintenance, MaintenanceStatus } from './maintenance.entity';
import { AssetDocument } from './asset-document.entity';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetFiltersDto } from './dto/asset-filters.dto';
import { TransferAssetDto } from './dto/transfer-asset.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { AssetStatus, AssetHistoryAction, StellarStatus } from './enums';
import { DepartmentsService } from '../departments/departments.service';
import { CategoriesService } from '../categories/categories.service';
import { UsersService } from '../users/users.service';
import { StellarService } from '../stellar/stellar.service';
import { User } from '../users/user.entity';

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    @InjectRepository(Asset)
    private readonly assetsRepo: Repository<Asset>,
    @InjectRepository(AssetHistory)
    private readonly historyRepo: Repository<AssetHistory>,
    @InjectRepository(AssetNote)
    private readonly notesRepo: Repository<AssetNote>,
    @InjectRepository(Maintenance)
    private readonly maintenanceRepo: Repository<Maintenance>,
    @InjectRepository(AssetDocument)
    private readonly documentsRepo: Repository<AssetDocument>,
    private readonly departmentsService: DepartmentsService,
    private readonly categoriesService: CategoriesService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly stellarService: StellarService,
  ) {}

  async findAll(filters: AssetFiltersDto): Promise<{ data: Asset[]; total: number; page: number; limit: number }> {
    const { search, status, condition, categoryId, departmentId, page = 1, limit = 20 } = filters;

    const qb = this.assetsRepo
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.department', 'department')
      .leftJoinAndSelect('asset.assignedTo', 'assignedTo')
      .leftJoinAndSelect('asset.createdBy', 'createdBy')
      .leftJoinAndSelect('asset.updatedBy', 'updatedBy');

    if (search) {
      qb.andWhere(
        '(asset.name ILIKE :search OR asset.assetId ILIKE :search OR asset.serialNumber ILIKE :search OR asset.manufacturer ILIKE :search OR asset.model ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (status) qb.andWhere('asset.status = :status', { status });
    if (condition) qb.andWhere('asset.condition = :condition', { condition });
    if (categoryId) qb.andWhere('category.id = :categoryId', { categoryId });
    if (departmentId) qb.andWhere('department.id = :departmentId', { departmentId });

    qb.orderBy('asset.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Asset> {
    const asset = await this.assetsRepo
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.department', 'department')
      .leftJoinAndSelect('asset.assignedTo', 'assignedTo')
      .leftJoinAndSelect('asset.createdBy', 'createdBy')
      .leftJoinAndSelect('asset.updatedBy', 'updatedBy')
      .where('asset.id = :id', { id })
      .getOne();

    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async create(dto: CreateAssetDto, currentUser: User): Promise<Asset> {
    const category = await this.categoriesService.findOne(dto.categoryId);
    const department = await this.departmentsService.findOne(dto.departmentId);
    const assignedTo = dto.assignedToId
      ? await this.usersService.findById(dto.assignedToId)
      : null;

    const assetId = await this.generateAssetId();

    const asset = this.assetsRepo.create({
      assetId,
      name: dto.name,
      description: dto.description ?? null,
      category,
      department,
      assignedTo,
      serialNumber: dto.serialNumber ?? null,
      purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
      purchasePrice: dto.purchasePrice ?? null,
      currentValue: dto.currentValue ?? null,
      warrantyExpiration: dto.warrantyExpiration ? new Date(dto.warrantyExpiration) : null,
      status: dto.status ?? AssetStatus.ACTIVE,
      condition: dto.condition,
      location: dto.location ?? null,
      manufacturer: dto.manufacturer ?? null,
      model: dto.model ?? null,
      tags: dto.tags ?? null,
      notes: dto.notes ?? null,
      createdBy: currentUser,
      updatedBy: currentUser,
    });

    const saved = await this.assetsRepo.save(asset);

    await this.logHistory(saved, AssetHistoryAction.CREATED, 'Asset registered', null, null, currentUser);

    // Derive on-chain ID deterministically and mark PENDING (only if Stellar enabled)
    if (this.stellarService.isEnabled) {
      const { hex: stellarAssetId } = this.stellarService.deriveAssetId(saved.id);
      await this.assetsRepo.update(saved.id, {
        stellarAssetId,
        stellarStatus: StellarStatus.PENDING,
      });

      // Fire-and-forget: non-blocking
      this.registerOnChain(saved).catch((err: Error) => {
        this.logger.error(
          `On-chain registration failed for asset ${saved.assetId}: ${err.message}`,
          err.stack,
        );
      });
    }

    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateAssetDto, currentUser: User): Promise<Asset> {
    const asset = await this.findOne(id);
    const before = { ...asset };

    if (dto.categoryId) asset.category = await this.categoriesService.findOne(dto.categoryId);
    if (dto.departmentId) asset.department = await this.departmentsService.findOne(dto.departmentId);
    if (dto.assignedToId !== undefined) {
      asset.assignedTo = dto.assignedToId ? await this.usersService.findById(dto.assignedToId) : null;
    }

    const fields: (keyof UpdateAssetDto)[] = [
      'name', 'description', 'serialNumber', 'purchasePrice', 'currentValue',
      'status', 'condition', 'location', 'manufacturer', 'model', 'tags', 'notes',
    ];
    for (const field of fields) {
      if (dto[field] !== undefined) {
        (asset as unknown as Record<string, unknown>)[field] = dto[field] as unknown;
      }
    }
    if (dto.purchaseDate !== undefined) asset.purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : null;
    if (dto.warrantyExpiration !== undefined) asset.warrantyExpiration = dto.warrantyExpiration ? new Date(dto.warrantyExpiration) : null;

    asset.updatedBy = currentUser;

    await this.assetsRepo.save(asset);
    await this.logHistory(asset, AssetHistoryAction.UPDATED, 'Asset updated', before as unknown as Record<string, unknown>, dto as unknown as Record<string, unknown>, currentUser);

    return this.findOne(id);
  }

  async updateStatus(id: string, dto: UpdateStatusDto, currentUser: User): Promise<Asset> {
    const asset = await this.findOne(id);
    const prevStatus = asset.status;

    asset.status = dto.status;
    asset.updatedBy = currentUser;
    await this.assetsRepo.save(asset);

    await this.logHistory(
      asset,
      AssetHistoryAction.STATUS_CHANGED,
      `Status changed from ${prevStatus} to ${dto.status}`,
      { status: prevStatus },
      { status: dto.status },
      currentUser,
    );

    return this.findOne(id);
  }

  async transfer(id: string, dto: TransferAssetDto, currentUser: User): Promise<Asset> {
    const asset = await this.findOne(id);
    const prevDept = asset.department?.name;

    asset.department = await this.departmentsService.findOne(dto.departmentId);
    asset.assignedTo = dto.assignedToId ? await this.usersService.findById(dto.assignedToId) : null;
    if (dto.location !== undefined) asset.location = dto.location ?? null;
    asset.status = AssetStatus.ASSIGNED;
    asset.updatedBy = currentUser;

    await this.assetsRepo.save(asset);

    await this.logHistory(
      asset,
      AssetHistoryAction.TRANSFERRED,
      `Asset transferred from ${prevDept} to ${asset.department.name}${dto.notes ? '. ' + dto.notes : ''}`,
      { departmentId: prevDept },
      { departmentId: asset.department.name },
      currentUser,
    );

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const asset = await this.findOne(id);
    await this.assetsRepo.remove(asset);
  }

  async getHistory(assetId: string): Promise<AssetHistory[]> {
    await this.findOne(assetId);
    return this.historyRepo.find({
      where: { assetId },
      relations: ['performedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  // ── Notes ─────────────────────────────────────────────────────

  async getNotes(assetId: string): Promise<AssetNote[]> {
    await this.findOne(assetId);
    return this.notesRepo.find({
      where: { assetId },
      order: { createdAt: 'DESC' },
    });
  }

  async createNote(assetId: string, dto: CreateNoteDto, currentUser: User): Promise<AssetNote> {
    await this.findOne(assetId);
    const note = this.notesRepo.create({
      assetId,
      content: dto.content,
      createdBy: currentUser,
    });
    const saved = await this.notesRepo.save(note);
    await this.logHistory(
      { id: assetId } as Asset,
      AssetHistoryAction.NOTE_ADDED,
      'Note added',
      null,
      { content: dto.content },
      currentUser,
    );
    return saved;
  }

  async deleteNote(assetId: string, noteId: string): Promise<void> {
    const note = await this.notesRepo.findOne({ where: { id: noteId, assetId } });
    if (!note) throw new NotFoundException('Note not found');
    await this.notesRepo.remove(note);
  }

  // ── Maintenance ───────────────────────────────────────────────

  async getMaintenance(assetId: string): Promise<Maintenance[]> {
    await this.findOne(assetId);
    return this.maintenanceRepo.find({
      where: { assetId },
      order: { scheduledDate: 'DESC' },
    });
  }

  async createMaintenance(assetId: string, dto: CreateMaintenanceDto, currentUser: User): Promise<Maintenance> {
    await this.findOne(assetId);
    const record = this.maintenanceRepo.create({
      assetId,
      type: dto.type,
      description: dto.description,
      scheduledDate: new Date(dto.scheduledDate),
      cost: dto.cost ?? null,
      notes: dto.notes ?? null,
      performedBy: currentUser,
    });
    const saved = await this.maintenanceRepo.save(record);
    await this.logHistory(
      { id: assetId } as Asset,
      AssetHistoryAction.MAINTENANCE,
      `Maintenance scheduled: ${dto.description}`,
      null,
      { type: dto.type, scheduledDate: dto.scheduledDate },
      currentUser,
    );
    return saved;
  }

  async updateMaintenance(assetId: string, maintenanceId: string, dto: UpdateMaintenanceDto): Promise<Maintenance> {
    const record = await this.maintenanceRepo.findOne({ where: { id: maintenanceId, assetId } });
    if (!record) throw new NotFoundException('Maintenance record not found');

    if (dto.status !== undefined) record.status = dto.status;
    if (dto.completedDate !== undefined) record.completedDate = dto.completedDate ? new Date(dto.completedDate) : null;
    if (dto.cost !== undefined) record.cost = dto.cost ?? null;
    if (dto.notes !== undefined) record.notes = dto.notes ?? null;

    if (dto.status === MaintenanceStatus.COMPLETED && !record.completedDate) {
      record.completedDate = new Date();
    }

    return this.maintenanceRepo.save(record);
  }

  // ── Documents ─────────────────────────────────────────────────

  async getDocuments(assetId: string): Promise<AssetDocument[]> {
    await this.findOne(assetId);
    return this.documentsRepo.find({
      where: { assetId },
      order: { createdAt: 'DESC' },
    });
  }

  async addDocument(assetId: string, dto: CreateDocumentDto, currentUser: User): Promise<AssetDocument> {
    await this.findOne(assetId);
    const doc = this.documentsRepo.create({
      assetId,
      name: dto.name,
      url: dto.url,
      type: dto.type ?? 'application/octet-stream',
      size: dto.size ?? null,
      uploadedBy: currentUser,
    });
    const saved = await this.documentsRepo.save(doc);
    await this.logHistory(
      { id: assetId } as Asset,
      AssetHistoryAction.DOCUMENT_UPLOADED,
      `Document added: ${dto.name}`,
      null,
      { name: dto.name, url: dto.url },
      currentUser,
    );
    return saved;
  }

  async deleteDocument(assetId: string, documentId: string): Promise<void> {
    const doc = await this.documentsRepo.findOne({ where: { id: documentId, assetId } });
    if (!doc) throw new NotFoundException('Document not found');
    await this.documentsRepo.remove(doc);
  }

  private async registerOnChain(asset: Asset): Promise<void> {
    try {
      const txHash = await this.stellarService.registerAsset(asset);
      await this.assetsRepo.update(asset.id, {
        stellarTxHash: txHash,
        stellarStatus: StellarStatus.CONFIRMED,
      });
      this.logger.log(`Asset ${asset.assetId} anchored on Stellar. Tx: ${txHash}`);
    } catch (err) {
      await this.assetsRepo.update(asset.id, { stellarStatus: StellarStatus.FAILED });
      throw err;
    }
  }

  private async generateAssetId(): Promise<string> {
    const prefix = this.configService.get<string>('ASSET_ID_PREFIX', 'AST');
    const count = await this.assetsRepo.count();
    const start = Number(this.configService.get('ASSET_ID_START', 1000));
    return `${prefix}-${start + count + 1}`;
  }

  private async logHistory(
    asset: Asset,
    action: AssetHistoryAction,
    description: string,
    previousValue: Record<string, unknown> | null,
    newValue: Record<string, unknown> | null,
    performedBy: User,
  ): Promise<void> {
    const entry = this.historyRepo.create({
      assetId: asset.id,
      action,
      description,
      previousValue,
      newValue,
      performedBy,
    });
    await this.historyRepo.save(entry);
  }
}
