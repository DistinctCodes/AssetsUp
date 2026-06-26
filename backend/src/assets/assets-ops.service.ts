import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Asset } from './entities/asset.entity';
import { AssetNote } from './entities/asset-note.entity';
import { CreateNoteDto } from './dtos/create-note.dto';
import { BulkStatusDto } from './dtos/bulk-status.dto';
import { BulkDeleteDto } from './dtos/bulk-delete.dto';
import { BulkTransferDto } from './dtos/bulk-transfer.dto';
import * as QRCode from 'qrcode';
import * as bwipjs from 'bwip-js';

@Injectable()
export class AssetsOpsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(AssetNote)
    private readonly noteRepository: Repository<AssetNote>,
  ) {}

  async createNote(assetId: string, dto: CreateNoteDto, userId?: string): Promise<AssetNote> {
    const asset = await this.assetRepository.findOne({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');

    const note = this.noteRepository.create({
      assetId,
      content: dto.content,
      createdById: userId,
    });
    return this.noteRepository.save(note);
  }

  async getNotes(assetId: string): Promise<AssetNote[]> {
    return this.noteRepository.find({
      where: { assetId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async deleteNote(assetId: string, noteId: string): Promise<void> {
    const note = await this.noteRepository.findOne({ where: { id: noteId, assetId } });
    if (!note) throw new NotFoundException('Note not found');
    await this.noteRepository.remove(note);
  }

  async generateQRCode(assetId: string): Promise<string> {
    const asset = await this.assetRepository.findOne({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');

    const qrData = JSON.stringify({ id: asset.id, assetId: asset.assetId, name: asset.name });
    const qrCode = await QRCode.toDataURL(qrData);

    await this.assetRepository.update(assetId, { qrCode });
    return qrCode;
  }

  async generateBarcode(assetId: string): Promise<string> {
    const asset = await this.assetRepository.findOne({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');

    const barcode = await new Promise<string>((resolve, reject) => {
      bwipjs.toBuffer({
        bcid: 'code128',
        text: asset.assetId,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
      }, (err: Error | null, buffer?: Buffer) => {
        if (err) reject(err);
        else resolve(`data:image/png;base64,${buffer.toString('base64')}`);
      });
    });

    await this.assetRepository.update(assetId, { barcode });
    return barcode;
  }

  async bulkStatusUpdate(dto: BulkStatusDto, userId?: string): Promise<number> {
    const result = await this.assetRepository.update(
      { id: In(dto.ids) },
      { status: dto.status, updatedById: userId },
    );
    return result.affected || 0;
  }

  async bulkDelete(dto: BulkDeleteDto): Promise<number> {
    const result = await this.assetRepository.softDelete({ id: In(dto.ids) });
    return result.affected || 0;
  }

  async bulkTransfer(dto: BulkTransferDto, userId?: string): Promise<number> {
    const updateData: Partial<Asset> = { updatedById: userId };
    if (dto.assignedToId) updateData.assignedToId = dto.assignedToId;
    if (dto.departmentId) updateData.departmentId = dto.departmentId;
    if (dto.location) updateData.location = dto.location;

    const result = await this.assetRepository.update(
      { id: In(dto.ids) },
      updateData,
    );
    return result.affected || 0;
  }

  async bulkExport(ids?: string[]) {
    const where = ids ? { id: In(ids) } : {};
    return this.assetRepository.find({ where, relations: ['assignedTo', 'createdBy'] });
  }
}
