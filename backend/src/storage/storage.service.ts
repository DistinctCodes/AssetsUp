import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { createReadStream, promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface StoredFile {
  key: string;
  size: number;
  mimeType: string;
}

export interface UploadOptions {
  folder: string;
  filename: string;
  mimeType: string;
}

/**
 * Shared, provider-agnostic file storage used by asset documents, photos and
 * bulk import. The default driver writes to local disk under `STORAGE_ROOT`
 * (default `./uploads`); the same interface can be backed by S3 later without
 * changing callers.
 */
@Injectable()
export class StorageService {
  private readonly root = process.env.STORAGE_ROOT ?? path.resolve('uploads');

  async upload(file: Buffer, opts: UploadOptions): Promise<StoredFile> {
    const safeName = `${crypto.randomBytes(8).toString('hex')}-${opts.filename}`;
    const key = path.posix.join(opts.folder, safeName);
    const dest = path.join(this.root, key);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, file);
    return { key, size: file.length, mimeType: opts.mimeType };
  }

  getStream(key: string): Readable {
    return createReadStream(path.join(this.root, key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(path.join(this.root, key), { force: true });
  }
}
