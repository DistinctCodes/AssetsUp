import { planPurchaseOrderReceipt } from './abdulrcrtw-po-receipt.helper';

describe('abdulrcrtw-po-receipt.helper', () => {
  it('creates assets/stock plans and tracks partial receipts per line item', () => {
    const plan = planPurchaseOrderReceipt({
      purchaseOrderId: 'po-1',
      vendorId: 'v-1',
      lineItems: [
        { id: 'li-1', description: 'Laptop', quantity: 2, receivedQuantity: 0, unitCostMinor: 100000, kind: 'ASSET' },
        { id: 'li-2', description: 'Toner', quantity: 5, receivedQuantity: 0, unitCostMinor: 5000, kind: 'CONSUMABLE', inventoryItemId: 'inv-1' },
      ],
      receipt: { lineItems: [{ lineItemId: 'li-1', receivedQuantity: 1 }] },
    });
    expect(plan.status).toBe('PARTIALLY_RECEIVED');
    expect(plan.assetsToCreate).toEqual([
      expect.objectContaining({ lineItemId: 'li-1', quantity: 1, vendorId: 'v-1', purchaseOrderId: 'po-1' }),
    ]);
    expect(plan.stockMovements).toEqual([]);
  });

  it('marks fully received when all quantities satisfied', () => {
    const plan = planPurchaseOrderReceipt({
      purchaseOrderId: 'po-1',
      lineItems: [
        { id: 'li-2', description: 'Toner', quantity: 2, receivedQuantity: 1, unitCostMinor: 5000, kind: 'CONSUMABLE', inventoryItemId: 'inv-1' },
      ],
      receipt: { lineItems: [{ lineItemId: 'li-2', receivedQuantity: 1 }] },
    });
    expect(plan.status).toBe('RECEIVED');
    expect(plan.stockMovements[0]).toEqual(expect.objectContaining({ type: 'IN', quantity: 1, inventoryItemId: 'inv-1' }));
  });
});
