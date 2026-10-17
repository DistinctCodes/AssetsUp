import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import * as bwipjs from 'bwip-js';
import { Asset } from './entities/asset.entity';

export interface RenderedImage {
  body: Buffer | string;
  contentType: string;
}

/** Renders the QR code and printable barcode label for an asset. */
@Injectable()
export class AssetLabelService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
  ) {}

  /** The URL a scanned QR code opens. */
  scanUrl(assetId: string): string {
    const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(
      /\/+$/,
      '',
    );
    return `${base}/assets/${assetId}`;
  }

  private async load(id: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException(`Asset ${id} not found`);
    return asset;
  }

  async qr(
    id: string,
    format: 'png' | 'svg' = 'png',
    size = 256,
  ): Promise<RenderedImage> {
    await this.load(id);
    const url = this.scanUrl(id);
    if (format === 'svg') {
      const body = await QRCode.toString(url, {
        type: 'svg',
        width: size,
        margin: 1,
      });
      return { body, contentType: 'image/svg+xml' };
    }
    const body = await QRCode.toBuffer(url, { width: size, margin: 1 });
    return { body, contentType: 'image/png' };
  }

  /** Code 128 barcode of the asset tag, with the tag printed beneath it. */
  async label(id: string, scale = 3): Promise<RenderedImage> {
    const asset = await this.load(id);
    const body = await bwipjs.toBuffer({
      bcid: 'code128',
      text: asset.assetTag,
      scale,
      height: 12,
      includetext: true,
      textxalign: 'center',
    });
    return { body, contentType: 'image/png' };
  }
}
