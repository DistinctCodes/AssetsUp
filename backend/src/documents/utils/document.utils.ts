import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * File utility functions for document management
 */

export class DocumentFileUtils {
  /**
   * Generate a unique file path for document storage
   */
  static generateStoragePath(baseDir: string, documentId: string, fileName: string): string {
    const timestamp = Date.now();
    const sanitizedName = fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .toLowerCase()
      .substring(0, 255);
    return path.join(baseDir, documentId, `${timestamp}-${sanitizedName}`);
  }

  /**
   * Calculate SHA256 checksum of a file
   */
  static calculateChecksum(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Verify file integrity using checksum
   */
  static verifyChecksum(filePath: string, expectedChecksum: string): boolean {
    return this.calculateChecksum(filePath) === expectedChecksum;
  }

  /**
   * Get file size in human-readable format
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Sanitize file name for safe storage
   */
  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  }

  /**
   * Get file extension
   */
  static getFileExtension(fileName: string): string {
    return path.extname(fileName).toLowerCase();
  }

  /**
   * Check if file type is allowed
   */
  static isAllowedFileType(fileName: string, allowedTypes: string[] = []): boolean {
    if (allowedTypes.length === 0) {
      return true; // No restrictions
    }

    const ext = this.getFileExtension(fileName);
    return allowedTypes.some(
      (type) => type.toLowerCase() === ext.toLowerCase() || type === '*',
    );
  }

  /**
   * Create directory if it doesn't exist
   */
  static ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Delete file safely
   */
  static deleteFileSafely(filePath: string): boolean {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to delete file: ${filePath}`, error);
      return false;
    }
  }

  /**
   * Get file metadata
   */
  static getFileMetadata(
    filePath: string,
  ): {
    size: number;
    created: Date;
    modified: Date;
    exists: boolean;
  } {
    try {
      const stats = fs.statSync(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        exists: true,
      };
    } catch (error) {
      return {
        size: 0,
        created: null,
        modified: null,
        exists: false,
      };
    }
  }

  /**
   * Copy file to destination
   */
  static copyFile(source: string, destination: string): boolean {
    try {
      this.ensureDirectoryExists(path.dirname(destination));
      fs.copyFileSync(source, destination);
      return true;
    } catch (error) {
      console.error(`Failed to copy file from ${source} to ${destination}`, error);
      return false;
    }
  }

  /**
   * Move file to destination
   */
  static moveFile(source: string, destination: string): boolean {
    try {
      this.ensureDirectoryExists(path.dirname(destination));
      fs.renameSync(source, destination);
      return true;
    } catch (error) {
      console.error(`Failed to move file from ${source} to ${destination}`, error);
      return false;
    }
  }

  /**
   * Get document type from MIME type
   */
  static getDocumentTypeFromMime(mimeType: string): string {
    const mimeMap = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'application/zip': 'zip',
      'application/x-rar-compressed': 'rar',
      'application/gzip': 'gz',
      'text/plain': 'txt',
      'text/csv': 'csv',
      'text/html': 'html',
      'application/json': 'json',
    };

    return mimeMap[mimeType] || 'unknown';
  }
}

/**
 * Validation utilities for document management
 */
export class DocumentValidationUtils {
  /**
   * Validate file size
   */
  static isFileSizeValid(fileSize: number, maxSize: number = 500 * 1024 * 1024): boolean {
    return fileSize > 0 && fileSize <= maxSize;
  }

  /**
   * Validate MIME type
   */
  static isValidMimeType(mimeType: string): boolean {
    const validMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'application/x-rar-compressed',
      'application/gzip',
      'text/plain',
      'text/csv',
      'text/html',
      'application/json',
    ];

    return validMimeTypes.includes(mimeType);
  }

  /**
   * Validate file name
   */
  static isValidFileName(fileName: string): boolean {
    if (!fileName || fileName.length === 0 || fileName.length > 255) {
      return false;
    }

    // Check for invalid characters
    const invalidChars = /[<>:"|?*\x00-\x1F]/g;
    return !invalidChars.test(fileName);
  }

  /**
   * Validate asset ID format
   */
  static isValidAssetId(assetId: string): boolean {
    // UUID v4 format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(assetId);
  }

  /**
   * Validate user ID format
   */
  static isValidUserId(userId: string): boolean {
    // UUID format or email
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return uuidRegex.test(userId) || emailRegex.test(userId);
  }
}
