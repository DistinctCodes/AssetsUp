import { BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('StorageService path safety', () => {
  let root: string;
  let StorageService: typeof import('./storage.service').StorageService;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'assetsup-storage-'));
    process.env.STORAGE_ROOT = path.join(root, 'uploads');
    jest.resetModules();
    ({ StorageService } = await import('./storage.service'));
  });

  afterEach(async () => {
    delete process.env.STORAGE_ROOT;
    await fs.rm(root, { recursive: true, force: true });
  });

  it('keeps an uploaded "../../evil.txt" inside the storage root', async () => {
    const svc = new StorageService();
    const stored = await svc.upload(Buffer.from('x'), {
      folder: 'docs',
      filename: '../../evil.txt',
      mimeType: 'text/plain',
    });

    expect(stored.key).toMatch(/^docs\/[0-9a-f]{16}-evil\.txt$/);
    await expect(
      fs.stat(path.join(root, 'uploads', stored.key)),
    ).resolves.toBeDefined();
    // Nothing escaped to the parent directories.
    await expect(fs.stat(path.join(root, 'evil.txt'))).rejects.toBeDefined();
  });

  it('rejects a traversal folder', async () => {
    const svc = new StorageService();
    await expect(
      svc.upload(Buffer.from('x'), {
        folder: '../outside',
        filename: 'a.txt',
        mimeType: 'text/plain',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses to read or delete keys outside the root', async () => {
    const svc = new StorageService();
    expect(() => svc.getStream('../../etc/passwd')).toThrow(
      BadRequestException,
    );
    await expect(svc.delete('../secret')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
