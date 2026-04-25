import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { diskStorage, Options as MulterOptions } from 'multer';
import { v4 as uuidv4 } from 'uuid';

function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

function extension(fileName: string): string {
  const index = fileName.lastIndexOf('.');
  return index >= 0 ? fileName.slice(index).toLowerCase() : '';
}

export function imageMulterOptions(uploadRoot: string): MulterOptions {
  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = join(uploadRoot, 'images');
        ensureDir(dir);
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        cb(null, `${uuidv4()}${extension(file.originalname)}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      cb(null, allowed.includes(file.mimetype));
    },
  };
}

export function documentMulterOptions(uploadRoot: string): MulterOptions {
  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = join(uploadRoot, 'documents');
        ensureDir(dir);
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        cb(null, `${uuidv4()}${extension(file.originalname)}`);
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
      ];
      cb(null, allowed.includes(file.mimetype));
    },
  };
}

@Injectable()
export class UploadService {
  constructor(private readonly configService: ConfigService) {}

  get uploadRoot(): string {
    return this.configService.get<string>('UPLOAD_DEST', 'uploads');
  }

  imageUrl(filename: string): string {
    return `/uploads/images/${filename}`;
  }

  documentUrl(filename: string): string {
    return `/uploads/documents/${filename}`;
  }
}
