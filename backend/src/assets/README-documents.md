# Asset Documents

Attach files (invoices, warranties, manuals) to an asset, powering the Documents
tab (drag-and-drop upload) on the asset detail page.

## Entity — `AssetDocument`

`id`, `asset` (ManyToOne), `name`, `fileKey` (storage key), `mimeType`,
`sizeBytes`, `uploadedBy` (User), `createdAt`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST`   | `/api/assets/:id/documents` | Multipart upload (`file` field, optional `name`) |
| `GET`    | `/api/assets/:id/documents` | List documents for an asset |
| `GET`    | `/api/assets/:id/documents/:docId/download` | Download a document |
| `DELETE` | `/api/assets/:id/documents/:docId` | Delete a document |

Files are stored through the shared `StorageService` (local disk driver,
S3-ready), and only the metadata is kept in the database.
