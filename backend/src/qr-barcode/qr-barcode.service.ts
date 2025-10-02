import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import * as bwipjs from 'bwip-js';
import * as fs from 'fs';
import * as path from 'path';
import { Asset } from 'src/assets/entities/assest.entity';

@Injectable()
export class QrBarcodeService {
  private readonly logger = new Logger(QrBarcodeService.name);

  constructor(
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
  ) {}

  // ✅ Generates a QR code data URL
  async generateQrDataUrl(text: string): Promise<string> {
    const dataUrl = await QRCode.toDataURL(text, { errorCorrectionLevel: 'M' });
    return dataUrl; // e.g., data:image/png;base64,...
  }

  // ✅ Generates a barcode buffer (Code128)
  async generateBarcodeBuffer(text: string): Promise<Buffer> {
    return await bwipjs.toBuffer({
      bcid: 'code128',
      text: String(text),
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center',
    });
  }

  bufferToDataUrl(buffer: Buffer, mime = 'image/png') {
    return `data:${mime};base64,${buffer.toString('base64')}`;
  }

  async saveBufferToDisk(buffer: Buffer, filename: string): Promise<string> {
    const uploadDir = path.resolve(process.cwd(), 'uploads', 'codes');
    await fs.promises.mkdir(uploadDir, { recursive: true });
    const filepath = path.join(uploadDir, filename);
    await fs.promises.writeFile(filepath, buffer);
    return filepath;
  }

  // ✅ Main generator for asset
  async generateAndStoreForAsset(
    assetId: string,
    options: {
      persist?: boolean;
      saveToDisk?: boolean;
      type?: 'qr' | 'barcode' | 'both';
    } = {},
  ) {
    const asset = await this.assetRepo.findOne({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');

    const result: {
      qr?: string;
      barcode?: string;
      qrFilename?: string;
      barcodeFilename?: string;
    } = {};

    const { persist = true, saveToDisk = false, type = 'both' } = options;

    // Content encoded in the codes
    const payload = JSON.stringify({ id: asset.id, name: asset.name });

    if (type === 'qr' || type === 'both') {
      const qrDataUrl = await this.generateQrDataUrl(payload);
      result.qr = qrDataUrl;

      if (saveToDisk) {
        const base64 = qrDataUrl.split(',')[1];
        const buffer = Buffer.from(base64, 'base64');
        const filename = `${asset.id}-qr.png`;
        const filepath = await this.saveBufferToDisk(buffer, filename);
        result.qrFilename = filepath;
        asset.qrCodeFilename = filepath;
      }

      if (persist) {
        asset.qrCodeBase64 = qrDataUrl;
      }
    }

    if (type === 'barcode' || type === 'both') {
      const barcodeBuffer = await this.generateBarcodeBuffer(asset.id);
      const barcodeDataUrl = this.bufferToDataUrl(barcodeBuffer);
      result.barcode = barcodeDataUrl;

      if (saveToDisk) {
        const filename = `${asset.id}-barcode.png`;
        const filepath = await this.saveBufferToDisk(barcodeBuffer, filename);
        result.barcodeFilename = filepath;
        asset.barcodeFilename = filepath;
      }

      if (persist) {
        asset.barcodeBase64 = barcodeDataUrl;
      }
    }

    if (persist) {
      await this.assetRepo.save(asset);
    }

    return result;
  }

  // ✅ Retrieve stored codes
  async getCodesForAsset(assetId: string) {
    const asset = await this.assetRepo.findOne({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');
    return {
      qr: asset.qrCodeBase64 ?? null,
      barcode: asset.barcodeBase64 ?? null,
      qrFilename: asset.qrCodeFilename ?? null,
      barcodeFilename: asset.barcodeFilename ?? null,
    };
  }

  // ✅ Verify scanned payload
  async verifyPayload(payloadString: string) {
    try {
      const payload = JSON.parse(payloadString);
      if (!payload.id) return { valid: false };
      const asset = await this.assetRepo.findOne({ where: { id: payload.id } });
      if (!asset) return { valid: false };
      return { valid: true, asset };
    } catch (err) {
      this.logger.debug('verifyPayload error: ' + (err?.message ?? err));
      return { valid: false };
    }
  }
}
