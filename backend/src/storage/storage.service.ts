import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: string | null;
  private readonly region: string;
  private readonly client: S3Client | null;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET')?.trim() || null;
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');

    if (!this.bucket) {
      this.logger.warn('AWS_S3_BUCKET not configured; storage uploads are disabled');
      this.client = null;
      return;
    }

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const credentials =
      accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;

    this.client = new S3Client({
      region: this.region,
      credentials,
    });
  }

  get isEnabled(): boolean {
    return Boolean(this.client && this.bucket);
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ url: string; key: string; bucket: string }> {
    if (!this.isEnabled || !file.buffer) {
      throw new BadRequestException('Object storage is not configured or file is missing');
    }

    const normalizedFolder = folder?.replace(/^\/|\/$/g, '') ?? '';
    const baseName = path.basename(file.originalname);
    const key = `${normalizedFolder ? `${normalizedFolder}/` : ''}${Date.now()}-${baseName}`;

    await this.client!.send(
      new PutObjectCommand({
        Bucket: this.bucket!,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const hostname =
      this.region === 'us-east-1'
        ? `https://${this.bucket}.s3.amazonaws.com`
        : `https://${this.bucket}.s3.${this.region}.amazonaws.com`;

    return {
      url: `${hostname}/${encodeURI(key)}`,
      key,
      bucket: this.bucket!,
    };
  }
}
