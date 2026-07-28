import { InventoryService } from './inventory/inventory.service';
import { VendorsService } from './vendors/vendors.service';
import { PurchaseOrdersService } from './purchase-orders/purchase-orders.service';
import { LicensesService } from './licenses/licenses.service';

describe('ibinola Modules (BE-96, BE-95, BE-94, BE-93)', () => {
  it('InventoryService manages movements and rejects negative stock', async () => {
    const item = { id: 'inv-1', sku: 'CABLE-01', quantityOnHand: 10 };
    const mockRepo = {
      findOne: jest.fn().mockResolvedValue(item),
      save: jest.fn().mockImplementation((dto) => Promise.resolve(dto)),
    };
    const service = new InventoryService(mockRepo as any);

    const result = await service.recordMovement('inv-1', 'OUT', 3);
    expect(result.item.quantityOnHand).toBe(7);

    await expect(service.recordMovement('inv-1', 'OUT', 20)).rejects.toThrow(
      'Movement would result in negative stock',
    );
  });

  it('VendorsService creates vendor records', async () => {
    const mockRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((dto) => Promise.resolve({ id: 'v-1', ...dto })),
    };
    const service = new VendorsService(mockRepo as any);
    const vendor = await service.create({ name: 'Acme Corp', code: 'ACME' });
    expect(vendor.name).toBe('Acme Corp');
  });

  it('PurchaseOrdersService receives POs', async () => {
    const po = { id: 'po-1', status: 'DRAFT' };
    const mockRepo = {
      findOne: jest.fn().mockResolvedValue(po),
      save: jest.fn().mockImplementation((dto) => Promise.resolve(dto)),
    };
    const service = new PurchaseOrdersService(mockRepo as any);
    const received = await service.receive('po-1');
    expect(received.status).toBe('RECEIVED');
  });

  it('LicensesService enforces seat limit', async () => {
    const lic = { id: 'lic-1', seatsTotal: 2, seatsUsed: 2 };
    const mockRepo = {
      findOne: jest.fn().mockResolvedValue(lic),
      save: jest.fn().mockImplementation((dto) => Promise.resolve(dto)),
    };
    const service = new LicensesService(mockRepo as any);

    await expect(service.assign('lic-1', 'u-1')).rejects.toThrow(
      'No available seats remaining for this license',
    );
  });
});
