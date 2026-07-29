import { NotesDocsController } from './assets/notes-docs.controller';
import { MaintenanceService } from './maintenance/maintenance.service';
import { TransfersService } from './transfers/transfers.service';

describe('abdulrcrtw Modules (BE-92, BE-91, BE-90, BE-89)', () => {
  it('NotesDocsController adds and lists asset notes and documents', () => {
    const controller = new NotesDocsController();
    const note = controller.addNote('ast-1', 'Need battery replacement', {
      user: { id: 'u-1' },
    } as any);
    expect(note.content).toBe('Need battery replacement');
    expect(controller.getNotes('ast-1').length).toBe(1);

    const doc = controller.addDocument(
      'ast-1',
      { title: 'Warranty.pdf', fileUrl: 'http://example.com/w.pdf' },
      { user: { id: 'u-1' } } as any,
    );
    expect(doc.title).toBe('Warranty.pdf');
    expect(controller.getDocuments('ast-1').length).toBe(1);
  });

  it('MaintenanceService creates maintenance records', async () => {
    const mockRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest
        .fn()
        .mockImplementation((dto) => Promise.resolve({ id: 'm-1', ...dto })),
    };
    const service = new MaintenanceService(mockRepo as any);
    const rec = await service.create({
      assetId: 'ast-1',
      title: 'Screen repair',
      cost: 15000,
    });
    expect(rec.cost).toBe(15000);
  });

  it('TransfersService manages approval workflow', async () => {
    const tr = { id: 'tr-1', status: 'PENDING' };
    const mockRepo = {
      findOne: jest.fn().mockResolvedValue(tr),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((dto) => Promise.resolve(dto)),
    };
    const service = new TransfersService(mockRepo as any);
    const approved = await service.approve('tr-1', 'manager-1');
    expect(approved.status).toBe('APPROVED');
    expect(approved.approvedByUserId).toBe('manager-1');
  });
});
