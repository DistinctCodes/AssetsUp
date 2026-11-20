export interface AssetNoteRecord {
  id: string;
  assetId: string;
  body: string;
  authorUserId: string;
  createdAt: string;
}

export interface AssetDocumentRecord {
  id: string;
  assetId: string;
  fileUrl: string;
  name?: string | null;
  authorUserId: string;
  createdAt: string;
}

export interface NotesDocsStore {
  notes: AssetNoteRecord[];
  documents: AssetDocumentRecord[];
}

export function ensureAssetExists(assetIds: ReadonlySet<string>, assetId: string): void {
  if (!assetIds.has(assetId)) {
    throw new Error(`Asset ${assetId} not found`);
  }
}

export function addAssetNote(
  store: NotesDocsStore,
  params: { id: string; assetId: string; body: string; authorUserId: string; now?: Date },
): AssetNoteRecord {
  const record: AssetNoteRecord = {
    id: params.id,
    assetId: params.assetId,
    body: params.body,
    authorUserId: params.authorUserId,
    createdAt: (params.now ?? new Date()).toISOString(),
  };
  store.notes.push(record);
  return record;
}

export function addAssetDocument(
  store: NotesDocsStore,
  params: { id: string; assetId: string; fileUrl: string; name?: string | null; authorUserId: string; now?: Date },
): AssetDocumentRecord {
  const record: AssetDocumentRecord = {
    id: params.id,
    assetId: params.assetId,
    fileUrl: params.fileUrl,
    name: params.name ?? null,
    authorUserId: params.authorUserId,
    createdAt: (params.now ?? new Date()).toISOString(),
  };
  store.documents.push(record);
  return record;
}
