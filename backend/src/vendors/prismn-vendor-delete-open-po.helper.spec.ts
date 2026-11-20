import {
  findBlockingPurchaseOrderForVendorDelete,
  isPrismnOpenPurchaseOrder,
} from './prismn-vendor-delete-open-po.helper';

describe('prismn-vendor-delete-open-po.helper', () => {
  it('treats only draft/submitted/approved as open', () => {
    expect(isPrismnOpenPurchaseOrder('DRAFT')).toBe(true);
    expect(isPrismnOpenPurchaseOrder('SUBMITTED')).toBe(true);
    expect(isPrismnOpenPurchaseOrder('APPROVED')).toBe(true);
    expect(isPrismnOpenPurchaseOrder('RECEIVED')).toBe(false);
    expect(isPrismnOpenPurchaseOrder('CANCELLED')).toBe(false);
  });

  it('allows delete when vendor has only received or cancelled POs', () => {
    const blocking = findBlockingPurchaseOrderForVendorDelete(
      [
        { id: 'po1', vendorId: 'v1', status: 'RECEIVED', poNumber: 'PO-1' },
        { id: 'po2', vendorId: 'v1', status: 'CANCELLED', poNumber: 'PO-2' },
      ],
      'v1',
    );
    expect(blocking).toBeNull();
  });
});
