import { addAssetDocument, addAssetNote, ensureAssetExists } from './danielships-asset-notes-docs-persistence.helper';

describe('danielships-asset-notes-docs-persistence.helper', () => {
  it('stores notes/documents with author and timestamp (persistence-ready records)', () => {
    const store = { notes: [], documents: [] } as any;
    ensureAssetExists(new Set(['a1']), 'a1');
    const note = addAssetNote(store, { id: 'n1', assetId: 'a1', body: 'hi', authorUserId: 'u1', now: new Date('2026-11-20T00:00:00Z') });
    const doc = addAssetDocument(store, { id: 'd1', assetId: 'a1', fileUrl: 'https://x/y.pdf', authorUserId: 'u1' });
    expect(note.authorUserId).toBe('u1');
    expect(store.notes[0]).toEqual(note);
    expect(store.documents[0].id).toBe(doc.id);
  });

  it('throws for unknown assets', () => {
    expect(() => ensureAssetExists(new Set(), 'missing')).toThrow('not found');
  });
});
