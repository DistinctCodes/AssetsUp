import { listInventoryMovements, recordInventoryMovement } from './danielships-inventory-movement-ledger.helper';

describe('danielships-inventory-movement-ledger.helper', () => {
  it('persists movement records and lists newest first with pagination', () => {
    const ledger = { movements: [] as any[] };
    recordInventoryMovement(ledger, { id: 'm1', inventoryItemId: 'i1', type: 'IN', quantity: 5, previousQuantity: 0, nextQuantity: 5, createdAt: '2026-11-20T00:00:00Z' } as any);
    recordInventoryMovement(ledger, { id: 'm2', inventoryItemId: 'i1', type: 'OUT', quantity: 2, previousQuantity: 5, nextQuantity: 3, createdAt: '2026-11-21T00:00:00Z' } as any);
    const page = listInventoryMovements(ledger, 'i1', 1, 10);
    expect(page.total).toBe(2);
    expect(page.items[0].id).toBe('m2');
  });
});
