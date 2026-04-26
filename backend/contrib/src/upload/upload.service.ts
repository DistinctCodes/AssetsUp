import { Injectable, BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { UploadResponseDto } from './dto/upload-response.dto';

/**
 * Simple file upload service for storing asset images and documents
 */
@Injectable()
export class UploadService {
  private readonly uploadDir: string;
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  constructor() {
    this.uploadDir = join(process.cwd(), 'uploads');
    this.ensureUploadDirExists();
  }

  /**
   * Ensure uploads directory exists
   */
  private ensureUploadDirExists(): void {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Upload a file (image or document)
   */
  async uploadFile(file: Express.Multer.File): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    this.validateFile(file);

    const filename = this.generateFileName(file.originalname);
    const filepath = join(this.uploadDir, filename);

    await fs.writeFile(filepath, file.buffer);

    return new UploadResponseDto(
      filename,
      filepath,
      file.size,
      file.mimetype,
    );
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(files: Express.Multer.File[]): Promise<UploadResponseDto[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    return Promise.all(files.map((file) => this.uploadFile(file)));
  }

  /**
   * Delete a file
   */
  async deleteFile(filename: string): Promise<void> {
    const filepath = join(this.uploadDir, filename);

    // Security check: ensure the file is within uploads directory
    if (!filepath.startsWith(this.uploadDir)) {
      throw new BadRequestException('Invalid file path');
    }

    if (existsSync(filepath)) {
      await fs.unlink(filepath);
    }
  }

  /**
   * Get file by filename
   */
  async getFile(filename: string): Promise<Buffer> {
    const filepath = join(this.uploadDir, filename);

    // Security check: ensure the file is within uploads directory
    if (!filepath.startsWith(this.uploadDir)) {
      throw new BadRequestException('Invalid file path');
    }

    if (!existsSync(filepath)) {
      throw new BadRequestException('File not found');
    }

    return fs.readFile(filepath);
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: Express.Multer.File): void {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }
  }

  /**
   * Generate unique filename
   */
  private generateFileName(originalname: string): string {
    const ext = originalname.split('.').pop() || 'bin';
    return `${uuidv4()}.${ext}`;
  }
}
