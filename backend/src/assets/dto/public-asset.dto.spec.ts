import { toPublicAsset } from './public-asset.dto';

describe('toPublicAsset', () => {
  const entity = {
    id: 'a-1',
    assetTag: 'AST-00001',
    name: 'Laptop',
    status: 'AVAILABLE',
    imageUrl: 'https://img/x.png',
    category: { name: 'IT', id: 'c-1' },
    location: { name: 'HQ', id: 'l-1' },
    purchaseCost: 123456,
    currentValue: '999.00',
    supplierId: 'v-1',
    serialNumber: 'SN-1',
    assignedToUserId: 'u-1',
    assignedTo: { email: 'private@example.com' },
    notes: 'internal',
  };

  it('maps only non-sensitive fields', () => {
    expect(toPublicAsset(entity as any)).toEqual({
      id: 'a-1',
      assetId: 'AST-00001',
      name: 'Laptop',
      status: 'AVAILABLE',
      category: 'IT',
      location: 'HQ',
      imageUrl: 'https://img/x.png',
    });
  });

  it('exposes no cost, supplier, assignee or serial fields', () => {
    const json = JSON.stringify(toPublicAsset(entity as any));
    for (const forbidden of [
      'purchaseCost',
      'currentValue',
      'supplier',
      'assignedTo',
      'private@example.com',
      'serialNumber',
      'SN-1',
      'internal',
    ]) {
      expect(json).not.toContain(forbidden);
    }
  });
});
