import { NotFoundException } from '@nestjs/common';
import { AssetLabelService } from './asset-label.service';

const asset = { id: 'a-1', assetTag: 'AST-00001' };

function build(found: unknown) {
  const repo = { findOne: jest.fn().mockResolvedValue(found) };
  return new AssetLabelService(repo as never);
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe('AssetLabelService', () => {
  it('returns a PNG QR code for a known asset', async () => {
    const img = await build(asset).qr('a-1');
    expect(img.contentType).toBe('image/png');
    expect((img.body as Buffer).subarray(0, 4)).toEqual(PNG);
  });

  it('returns an SVG QR code on request', async () => {
    const img = await build(asset).qr('a-1', 'svg', 128);
    expect(img.contentType).toBe('image/svg+xml');
    expect(String(img.body)).toContain('<svg');
  });

  it('returns a PNG barcode label of the asset tag', async () => {
    const img = await build(asset).label('a-1');
    expect(img.contentType).toBe('image/png');
    expect((img.body as Buffer).subarray(0, 4)).toEqual(PNG);
  });

  it('throws 404 for an unknown asset', async () => {
    const svc = build(null);
    await expect(svc.qr('missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.label('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('encodes the frontend asset URL', () => {
    const prev = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = 'https://app.example.com/';
    try {
      expect(build(asset).scanUrl('a-1')).toBe(
        'https://app.example.com/assets/a-1',
      );
    } finally {
      if (prev === undefined) delete process.env.FRONTEND_URL;
      else process.env.FRONTEND_URL = prev;
    }
  });
});
