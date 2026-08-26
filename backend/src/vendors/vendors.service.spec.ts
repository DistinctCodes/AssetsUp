import { VendorsService } from './vendors.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { POStatus } from '../purchase-orders/entities/purchase-order.entity';

describe('VendorsService', () => {
  let service: VendorsService;
  let mockVendorRepo: any;
  let mockPoRepo: any;

  beforeEach(() => {
    mockVendorRepo = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    mockPoRepo = {
      findOne: jest.fn(),
    };
    service = new VendorsService(mockVendorRepo, mockPoRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns paginated vendors', async () => {
      const vendors = [
        { id: 'v-1', name: 'Acme Corp', code: 'ACME' },
        { id: 'v-2', name: 'Beta Inc', code: 'BETA' },
      ];
      mockVendorRepo.findAndCount.mockResolvedValue([vendors, 2]);

      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.items).toEqual(vendors);
      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('applies search filter', async () => {
      mockVendorRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll({ page: 1, limit: 20, search: 'Acme' });
      expect(mockVendorRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ name: expect.any(Object) }),
        }),
      );
    });

    it('calculates total pages correctly', async () => {
      mockVendorRepo.findAndCount.mockResolvedValue([[], 45]);
      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.totalPages).toBe(3);
    });
  });

  describe('findById', () => {
    it('returns a vendor by id', async () => {
      const vendor = { id: 'v-1', name: 'Acme Corp', code: 'ACME' };
      mockVendorRepo.findOne.mockResolvedValue(vendor);
      const result = await service.findById('v-1');
      expect(result).toEqual(vendor);
    });

    it('throws NotFoundException when vendor does not exist', async () => {
      mockVendorRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates a vendor', async () => {
      const dto = { name: 'Acme Corp', code: 'ACME' };
      const created = { id: 'v-1', ...dto };
      mockVendorRepo.create.mockReturnValue(created);
      mockVendorRepo.save.mockResolvedValue(created);

      const result = await service.create(dto);
      expect(result.name).toBe('Acme Corp');
      expect(mockVendorRepo.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('updates an existing vendor', async () => {
      const existing = { id: 'v-1', name: 'Acme Corp', code: 'ACME' };
      mockVendorRepo.findOne.mockResolvedValue(existing);
      mockVendorRepo.save.mockImplementation((dto) =>
        Promise.resolve({ ...existing, ...dto }),
      );

      const result = await service.update('v-1', { name: 'Acme Updated' });
      expect(result.name).toBe('Acme Updated');
    });

    it('throws NotFoundException when updating non-existent vendor', async () => {
      mockVendorRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update('nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes a vendor with no open purchase orders', async () => {
      const vendor = { id: 'v-1', name: 'Acme Corp' };
      mockVendorRepo.findOne.mockResolvedValue(vendor);
      mockPoRepo.findOne.mockResolvedValue(null);
      mockVendorRepo.delete.mockResolvedValue(undefined);

      await service.delete('v-1');
      expect(mockVendorRepo.delete).toHaveBeenCalledWith('v-1');
    });

    it('throws NotFoundException when deleting non-existent vendor', async () => {
      mockVendorRepo.findOne.mockResolvedValue(null);
      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when vendor has open purchase orders', async () => {
      const vendor = { id: 'v-1', name: 'Acme Corp' };
      const openPo = {
        id: 'po-1',
        poNumber: 'PO-00001',
        vendorId: 'v-1',
        status: POStatus.DRAFT,
      };
      mockVendorRepo.findOne.mockResolvedValue(vendor);
      mockPoRepo.findOne.mockResolvedValue(openPo);

      await expect(service.delete('v-1')).rejects.toThrow(BadRequestException);
      await expect(service.delete('v-1')).rejects.toThrow(
        'Cannot delete vendor v-1: it is referenced by open purchase order PO-00001',
      );
    });

    it('allows deleting vendor when all POs are RECEIVED', async () => {
      const vendor = { id: 'v-1', name: 'Acme Corp' };
      mockVendorRepo.findOne.mockResolvedValue(vendor);
      mockPoRepo.findOne.mockResolvedValue(null); // No non-RECEIVED POs
      mockVendorRepo.delete.mockResolvedValue(undefined);

      await service.delete('v-1');
      expect(mockVendorRepo.delete).toHaveBeenCalledWith('v-1');
    });
  });
});
