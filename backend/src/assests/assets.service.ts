import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileService } from '../files/file.service'; // BE-06 S3 File Service
import { CreateAssetDto } from './dto/create-asset.dto';
import { Asset } from './entities/asset.entity';
import { AssetCodeGeneratorService } from './services/asset-code-generator.service';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    private readonly codeGeneratorService: AssetCodeGeneratorService,
    private readonly fileService: FileService,
  ) {}

  /**
   * Generates and uploads both QR and barcode PNGs to S3.
   */
  async generateAndUploadCodes(asset: Asset): Promise<{ qrKey: string; barcodeKey: string }> {
    const qrBuffer = await this.codeGeneratorService.generateQrCodeBuffer(asset.id);
    const barcodeBuffer = await this.codeGeneratorService.generateBarcodeBuffer(
      asset.assetTag || asset.id,
    );

    const qrKey = `qrcodes/${asset.id}/qrcode.png`;
    const barcodeKey = `qrcodes/${asset.id}/barcode.png`;

    await this.fileService.uploadBuffer(qrKey, qrBuffer, 'image/png');
    await this.fileService.uploadBuffer(barcodeKey, barcodeBuffer, 'image/png');

    return { qrKey, barcodeKey };
  }

  /**
   * POST /assets - Create Asset and auto-generate physical tags.
   */
  async createAsset(createAssetDto: CreateAssetDto): Promise<Asset> {
    const asset = this.assetRepository.create(createAssetDto);
    const savedAsset = await this.assetRepository.save(asset);

    const { qrKey, barcodeKey } = await this.generateAndUploadCodes(savedAsset);

    savedAsset.qrCode = qrKey;
    savedAsset.barcode = barcodeKey;

    return this.assetRepository.save(savedAsset);
  }

  /**
   * GET /assets/:id/qrcode - Get pre-signed URL for QR Code.
   */
  async getQrCodeUrl(id: string): Promise<{ url: string }> {
    const asset = await this.assetRepository.findOne({ where: { id } });
    if (!asset || !asset.qrCode) {
      throw new NotFoundException(`QR code not found for asset ID ${id}`);
    }

    const url = await this.fileService.getPresignedUrl(asset.qrCode, 3600); // 1 hour expiration
    return { url };
  }

  /**
   * GET /assets/:id/barcode - Get pre-signed URL for Barcode.
   */
  async getBarcodeUrl(id: string): Promise<{ url: string }> {
    const asset = await this.assetRepository.findOne({ where: { id } });
    if (!asset || !asset.barcode) {
      throw new NotFoundException(`Barcode not found for asset ID ${id}`);
    }

    const url = await this.fileService.getPresignedUrl(asset.barcode, 3600); // 1 hour expiration
    return { url };
  }

  /**
   * GET /assets/scan?code= - Look up asset by assetId string or barcode value.
   */
  async scanLookup(code: string): Promise<Asset> {
    if (!code) {
      throw new NotFoundException('Scan code parameter is required');
    }

    const asset = await this.assetRepository.findOne({
      where: [{ id: code }, { assetTag: code }],
    });

    if (!asset) {
      throw new NotFoundException(`No asset found matching code '${code}'`);
    }

    return asset;
  }

  /**
   * POST /assets/:id/regenerate-codes - Re-generate and re-upload QR and barcode images.
   */
  async regenerateCodes(id: string): Promise<Asset> {
    const asset = await this.assetRepository.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    const { qrKey, barcodeKey } = await this.generateAndUploadCodes(asset);

    asset.qrCode = qrKey;
    asset.barcode = barcodeKey;

    return this.assetRepository.save(asset);
  }
}