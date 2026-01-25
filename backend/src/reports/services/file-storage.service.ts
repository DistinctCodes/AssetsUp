import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get('UPLOAD_DIR', './uploads/reports');
    this.baseUrl = this.configService.get('BASE_URL', 'http://localhost:3000');
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      if (!fs.existsSync(this.uploadDir)) {
        await mkdir(this.uploadDir, { recursive: true });
      }
    } catch (error) {
      this.logger.error(`Failed to create upload directory: ${error.message}`);
    }
  }

  async saveFile(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<{ url: string; size: number }> {
    try {
      const filePath = path.join(this.uploadDir, filename);
      await writeFile(filePath, buffer);

      const url = `${this.baseUrl}/api/v1/reports/download/${filename}`;
      const size = buffer.length;

      this.logger.log(`File saved: ${filename} (${size} bytes)`);

      // Schedule file deletion after 24 hours
      this.scheduleFileDeletion(filename);

      return { url, size };
    } catch (error) {
      this.logger.error(`Failed to save file: ${error.message}`);
      throw error;
    }
  }

  async getFile(filename: string): Promise<Buffer> {
    try {
      const filePath = path.join(this.uploadDir, filename);
      return fs.promises.readFile(filePath);
    } catch (error) {
      this.logger.error(`Failed to read file: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(filename: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadDir, filename);
      if (fs.existsSync(filePath)) {
        await unlink(filePath);
        this.logger.log(`File deleted: ${filename}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
    }
  }

  private scheduleFileDeletion(filename: string): void {
    // Delete file after 24 hours
    const twentyFourHours = 24 * 60 * 60 * 1000;
    setTimeout(() => {
      this.deleteFile(filename);
    }, twentyFourHours);
  }

  generateFilename(
    reportName: string,
    format: string,
    executionId: string,
  ): string {
    const timestamp = Date.now();
    const sanitizedName = reportName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 50);
    const extension = this.getFileExtension(format);
    return `${sanitizedName}-${timestamp}-${executionId}.${extension}`;
  }

  private getFileExtension(format: string): string {
    const extensions = {
      PDF: 'pdf',
      EXCEL: 'xlsx',
      CSV: 'csv',
      JSON: 'json',
    };
    return extensions[format] || 'txt';
  }
}

// Alternative: AWS S3 Storage Service
// Uncomment and use this if you prefer S3 storage

/*
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucketName = this.configService.get('AWS_S3_BUCKET');
  }

  async saveFile(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<{ url: string; size: number }> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: `reports/${filename}`,
        Body: buffer,
        ContentType: mimeType,
      });

      await this.s3Client.send(command);

      // Generate presigned URL (expires in 24 hours)
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: `reports/${filename}`,
      });
      const url = await getSignedUrl(this.s3Client, getCommand, { expiresIn: 86400 });

      return { url, size: buffer.length };
    } catch (error) {
      this.logger.error(`Failed to upload to S3: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(filename: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: `reports/${filename}`,
      });
      await this.s3Client.send(command);
      this.logger.log(`File deleted from S3: ${filename}`);
    } catch (error) {
      this.logger.error(`Failed to delete from S3: ${error.message}`);
    }
  }
}
*/