import { PurchaseOrdersService } from './purchase-orders.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { POStatus } from './entities/purchase-order.entity';

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;
  let mockPoRepo: any;
  let mockLineItemRepo: any;

  beforeEach(() => {
    mockPoRepo = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    };
    mockLineItemRepo = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    service = new PurchaseOrdersService(mockPoRepo, mockLineItemRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns paginated purchase orders', async () => {
      const pos = [
        { id: 'po-1', poNumber: 'PO-00001', status: POStatus.DRAFT },
      ];
      mockPoRepo.findAndCount.mockResolvedValue([pos, 1]);

      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.items).toEqual(pos);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('applies search filter on poNumber', async () => {
      mockPoRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll({ page: 1, limit: 20, search: 'PO-00001' });
      expect(mockPoRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ poNumber: expect.any(Object) }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('returns a PO with line items', async () => {
      const po = {
        id: 'po-1',
        poNumber: 'PO-00001',
        status: POStatus.DRAFT,
        lineItems: [],
      };
      mockPoRepo.findOne.mockResolvedValue(po);
      const result = await service.findById('po-1');
      expect(result).toEqual(po);
      expect(mockPoRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        relations: ['lineItems'],
      });
    });

    it('throws NotFoundException when PO does not exist', async () => {
      mockPoRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates a PO with auto-generated poNumber', async () => {
      mockPoRepo.count.mockResolvedValue(0);
      const poData = { id: 'po-1', poNumber: 'PO-00001', status: POStatus.DRAFT };
      mockPoRepo.create.mockReturnValue(poData);
      mockPoRepo.save.mockResolvedValue(poData);
      mockPoRepo.findOne.mockResolvedValue({ ...poData, lineItems: [] });

      const result = await service.create({
        vendorId: 'v-1',
        totalAmount: 1000,
      });
      expect(mockPoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ poNumber: 'PO-00001' }),
      );
    });

    it('creates a PO with line items', async () => {
      mockPoRepo.count.mockResolvedValue(0);
      const poData = { id: 'po-1', poNumber: 'PO-00001', status: POStatus.DRAFT };
      mockPoRepo.create.mockReturnValue(poData);
      mockPoRepo.save.mockResolvedValue(poData);

      const lineItems = [
        { description: 'Widget A', quantity: 10, unitCost: 50 },
        { description: 'Widget B', quantity: 5, unitCost: 100 },
      ];

      const savedLineItems = lineItems.map((item, i) => ({
        id: `li-${i}`,
        ...item,
        purchaseOrderId: 'po-1',
      }));
      mockLineItemRepo.create.mockImplementation((dto) => dto);
      mockLineItemRepo.save.mockResolvedValue(savedLineItems);
      mockPoRepo.findOne.mockResolvedValue({
        ...poData,
        lineItems: savedLineItems,
        totalAmount: 1000,
      });

      const result = await service.create({
        vendorId: 'v-1',
        lineItems,
      });
      expect(mockLineItemRepo.save).toHaveBeenCalled();
    });

    it('sets initial status to DRAFT', async () => {
      mockPoRepo.count.mockResolvedValue(0);
      mockPoRepo.create.mockReturnValue({
        id: 'po-1',
        poNumber: 'PO-00001',
        status: POStatus.DRAFT,
      });
      mockPoRepo.save.mockResolvedValue({});
      mockPoRepo.findOne.mockResolvedValue({
        id: 'po-1',
        poNumber: 'PO-00001',
        status: POStatus.DRAFT,
        lineItems: [],
      });

      await service.create({ vendorId: 'v-1' });
      expect(mockPoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: POStatus.DRAFT }),
      );
    });
  });

  describe('update', () => {
    it('updates a DRAFT PO', async () => {
      const po = {
        id: 'po-1',
        poNumber: 'PO-00001',
        status: POStatus.DRAFT,
        lineItems: [],
      };
      mockPoRepo.findOne.mockResolvedValue(po);
      mockPoRepo.save.mockResolvedValue(po);

      const result = await service.update('po-1', { vendorId: 'v-2' });
      expect(mockPoRepo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException for non-existent PO', async () => {
      mockPoRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update('nonexistent', { vendorId: 'v-2' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when updating non-DRAFT PO', async () => {
      const po = {
        id: 'po-1',
        poNumber: 'PO-00001',
        status: POStatus.SUBMITTED,
        lineItems: [],
      };
      mockPoRepo.findOne.mockResolvedValue(po);

      await expect(
        service.update('po-1', { vendorId: 'v-2' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('po-1', { vendorId: 'v-2' }),
      ).rejects.toThrow('Only draft purchase orders can be edited');
    });

    it('replaces line items on update', async () => {
      const po = {
        id: 'po-1',
        poNumber: 'PO-00001',
        status: POStatus.DRAFT,
        lineItems: [],
      };
      mockPoRepo.findOne.mockResolvedValue(po);
      mockPoRepo.save.mockResolvedValue(po);
      mockLineItemRepo.delete.mockResolvedValue(undefined);
      mockLineItemRepo.create.mockImplementation((dto) => dto);
      mockLineItemRepo.save.mockResolvedValue([]);

      await service.update('po-1', {
        lineItems: [{ description: 'New Item', quantity: 1, unitCost: 100 }],
      });
      expect(mockLineItemRepo.delete).toHaveBeenCalledWith({
        purchaseOrderId: 'po-1',
      });
      expect(mockLineItemRepo.save).toHaveBeenCalled();
    });
  });

  describe('submit', () => {
    it('submits a DRAFT PO', async () => {
      const po = {
        id: 'po-1',
        poNumber: 'PO-00001',
        status: POStatus.DRAFT,
      };
      mockPoRepo.findOne.mockResolvedValue(po);
      mockPoRepo.save.mockImplementation((dto) =>
        Promise.resolve({ ...po, ...dto }),
      );

      const result = await service.submit('po-1');
      expect(result.status).toBe(POStatus.SUBMITTED);
    });

    it('throws BadRequestException when submitting non-DRAFT PO', async () => {
      const po = {
        id: 'po-1',
        poNumber: 'PO-00001',
        status: POStatus.SUBMITTED,
      };
      mockPoRepo.findOne.mockResolvedValue(po);

      await expect(service.submit('po-1')).rejects.toThrow(BadRequestException);
      await expect(service.submit('po-1')).rejects.toThrow(
        'Only draft purchase orders can be submitted',
      );
    });

    it('throws NotFoundException for non-existent PO', async () => {
      mockPoRepo.findOne.mockResolvedValue(null);
      await expect(service.submit('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('approve', () => {
    it('approves a SUBMITTED PO', async () => {
      const po = {
        id: 'po-1',
        poNumber: 'PO-00001',
        status: POStatus.SUBMITTED,
      };
      mockPoRepo.findOne.mockResolvedValue(po);
      mockPoRepo.save.mockImplementation((dto) =>
        Promise.resolve({ ...po, ...dto }),
      );

      const result = await service.approve('po-1', 'approver-1');
      expect(result.status).toBe(POStatus.APPROVED);
      expect(result.createdByUserId).toBe('approver-1');
    });

    it('throws BadRequestException when approving non-SUBMITTED PO', async () => {
      const po = {
        id: 'po-1',
        poNumber: 'PO-00001',
        status: POStatus.DRAFT,
      };
      mockPoRepo.findOne.mockResolvedValue(po);

      await expect(service.approve('po-1', 'a-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.approve('po-1', 'a-1')).rejects.toThrow(
        'Only submitted purchase orders can be approved',
      );
    });
  });

  describe('receive', () => {
    it('receives an APPROVED PO', async () => {
      const po = {
        id: 'po-1',
        poNumber: 'PO-00001',
        status: POStatus.APPROVED,
      };
      mockPoRepo.findOne.mockResolvedValue(po);
      mockPoRepo.save.mockImplementation((dto) =>
        Promise.resolve({ ...po, ...dto }),
      );

      const result = await service.receive('po-1');
      expect(result.status).toBe(POStatus.RECEIVED);
    });

    it('throws BadRequestException when receiving non-APPROVED PO', async () => {
      const po = {
        id: 'po-1',
        poNumber: 'PO-00001',
        status: POStatus.SUBMITTED,
      };
      mockPoRepo.findOne.mockResolvedValue(po);

      await expect(service.receive('po-1')).rejects.toThrow(BadRequestException);
      await expect(service.receive('po-1')).rejects.toThrow(
        'Only approved purchase orders can be received',
      );
    });
  });

  describe('cancel', () => {
    it('cancels a DRAFT PO', async () => {
      const po = {
        id: 'po-1',
        poNumber: 'PO-00001',
        status: POStatus.DRAFT,
      };
      mockPoRepo.findOne.mockResolvedValue(po);
      mockPoRepo.save.mockImplementation((dto) =>
        Promise.resolve({ ...po, ...dto }),
      );

      const result = await service.cancel('po-1');
      expect(result.status).toBe(POStatus.CANCELLED);
    });

    it('cancels a SUBMITTED PO', async () => {
      const po = {
        id: 'po-1',
        poNumber: 'PO-00001',
        status: POStatus.SUBMITTED,
      };
      mockPoRepo.findOne.mockResolvedValue(po);
      mockPoRepo.save.mockImplementation((dto) =>
        Promise.resolve({ ...po, ...dto }),
      );

      const result = await service.cancel('po-1');
      expect(result.status).toBe(POStatus.CANCELLED);
    });

    it('throws BadRequestException when cancelling APPROVED PO', async () => {
      const po = {
        id: 'po-1',
        poNumber: 'PO-00001',
        status: POStatus.APPROVED,
      };
      mockPoRepo.findOne.mockResolvedValue(po);

      await expect(service.cancel('po-1')).rejects.toThrow(BadRequestException);
      await expect(service.cancel('po-1')).rejects.toThrow(
        'Only draft or submitted purchase orders can be cancelled',
      );
    });

    it('throws BadRequestException when cancelling RECEIVED PO', async () => {
      const po = {
        id: 'po-1',
        poNumber: 'PO-00001',
        status: POStatus.RECEIVED,
      };
      mockPoRepo.findOne.mockResolvedValue(po);

      await expect(service.cancel('po-1')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for non-existent PO', async () => {
      mockPoRepo.findOne.mockResolvedValue(null);
      await expect(service.cancel('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
