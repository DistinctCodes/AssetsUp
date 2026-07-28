import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bwipjs from 'bwip-js';
import * as QRCode from 'qrcode';

@Injectable()
export class AssetCodeGeneratorService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Generates a QR Code PNG buffer encoding the frontend URL.
   */
  async generateQrCodeBuffer(assetId: string): Promise<Buffer> {
    try {
      const frontendUrl = this.configService.get<string>(
        'FRONTEND_URL',
        'http://localhost:3000',
      );
      const urlPayload = `${frontendUrl}/assets/${assetId}`;

      return await QRCode.toBuffer(urlPayload, {
        type: 'png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to generate QR code: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Generates a Code128 Barcode PNG buffer for physical asset tags.
   */
  async generateBarcodeBuffer(barcodeText: string): Promise<Buffer> {
    try {
      return await bwipjs.toBuffer({
        bcid: 'code128', // Barcode type
        text: barcodeText, // Text/tag to encode
        scale: 3,
        height: 10,
        includetext: true, // Show human-readable text below barcode
        textxalign: 'center',
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to generate barcode: ${(error as Error).message}`,
      );
    }
  }
}