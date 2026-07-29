import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditSession,
  AuditSessionStatus,
} from './entities/audit-session.entity';
import { AuditItem, AuditItemResult } from './entities/audit-item.entity';
import { Asset } from '../assets/entities/asset.entity';
import { CreateAuditSessionDto } from './dto/create-audit-session.dto';
import { RecordAuditItemDto } from './dto/record-audit-item.dto';

@Injectable()
export class AuditsService {
  constructor(
    @InjectRepository(AuditSession)
    private readonly sessionRepo: Repository<AuditSession>,
    @InjectRepository(AuditItem)
    private readonly itemRepo: Repository<AuditItem>,
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
  ) {}

  private summarize(session: AuditSession, items: AuditItem[]) {
    const total = items.length;
    const checked = items.filter(
      (i) => i.result !== AuditItemResult.PENDING,
    ).length;
    const discrepancies = items.filter(
      (i) =>
        i.result !== AuditItemResult.PENDING &&
        i.result !== AuditItemResult.FOUND,
    );
    return {
      ...session,
      totalItems: total,
      checkedItems: checked,
      progressPercent: total === 0 ? 0 : Math.round((checked / total) * 100),
      discrepancyCount: discrepancies.length,
    };
  }

  async findAll() {
    const sessions = await this.sessionRepo.find({
      order: { createdAt: 'DESC' },
    });
    const results = [];
    for (const session of sessions) {
      const items = await this.itemRepo.find({
        where: { auditSessionId: session.id },
      });
      results.push(this.summarize(session, items));
    }
    return results;
  }

  async findById(id: string) {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) throw new NotFoundException(`Audit session ${id} not found`);
    const items = await this.itemRepo.find({
      where: { auditSessionId: id },
      order: { createdAt: 'ASC' },
    });
    return { ...this.summarize(session, items), items };
  }

  async create(dto: CreateAuditSessionDto, actorId?: string) {
    if (!dto.departmentId && !dto.locationId) {
      throw new BadRequestException(
        'An audit session needs a department or location scope',
      );
    }

    const qb = this.assetRepo.createQueryBuilder('asset');
    if (dto.departmentId)
      qb.andWhere('asset.departmentId = :d', { d: dto.departmentId });
    if (dto.locationId)
      qb.andWhere('asset.locationId = :l', { l: dto.locationId });
    const assets = await qb.getMany();

    if (assets.length === 0) {
      throw new BadRequestException('No assets match the selected scope');
    }

    const session = this.sessionRepo.create({
      name: dto.name,
      scopeDepartmentId: dto.departmentId,
      scopeLocationId: dto.locationId,
      createdByUserId: actorId,
      status: AuditSessionStatus.DRAFT,
    });
    const savedSession = await this.sessionRepo.save(session);

    const items = assets.map((asset) =>
      this.itemRepo.create({
        auditSessionId: savedSession.id,
        assetId: asset.id,
        expectedLocationId: asset.locationId,
        result: AuditItemResult.PENDING,
      }),
    );
    await this.itemRepo.save(items);

    return this.findById(savedSession.id);
  }

  private async getMutableSession(id: string): Promise<AuditSession> {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) throw new NotFoundException(`Audit session ${id} not found`);
    if (session.status === AuditSessionStatus.COMPLETED) {
      throw new BadRequestException(
        'This audit session is completed and can no longer be edited',
      );
    }
    return session;
  }

  async recordItem(sessionId: string, itemId: string, dto: RecordAuditItemDto) {
    const session = await this.getMutableSession(sessionId);

    const item = await this.itemRepo.findOne({
      where: { id: itemId, auditSessionId: sessionId },
    });
    if (!item)
      throw new NotFoundException(
        `Audit item ${itemId} not found in this session`,
      );

    item.result = dto.result;
    item.note = dto.note;
    item.checkedAt = new Date();
    await this.itemRepo.save(item);

    if (session.status === AuditSessionStatus.DRAFT) {
      session.status = AuditSessionStatus.IN_PROGRESS;
      await this.sessionRepo.save(session);
    }

    return this.findById(sessionId);
  }

  async complete(sessionId: string) {
    const session = await this.getMutableSession(sessionId);
    session.status = AuditSessionStatus.COMPLETED;
    session.completedAt = new Date();
    await this.sessionRepo.save(session);
    return this.findById(sessionId);
  }
}
