# Document Management System - Integration Guide

This guide explains how to integrate the Document Management System with the Asset Management System.

## Overview

The Document Management System is designed to work seamlessly with the Asset Management System. Documents are associated with specific assets and inherit certain properties from them for consistency.

## Key Integration Points

### 1. Asset-Document Relationship

Each document is linked to an asset via the `assetId` field. This enables:

- **Lifecycle Tracking**: Documents follow the asset lifecycle
- **Permission Inheritance**: Document access is based on asset ownership
- **Audit Trail**: Asset changes are tracked alongside document changes
- **Organization**: Documents are grouped by asset for easy retrieval

### 2. Accessing Asset Documents

#### Via Document Service

```typescript
// Get all documents for an asset
const documents = await documentService.getDocumentsByAsset(assetId, userId);
```

#### Via API

```bash
GET /documents/asset/:assetId/documents
```

### 3. Upload Document for Asset

```typescript
// In your asset module
import { DocumentService } from '../documents/services/document.service';

@Injectable()
export class AssetDocumentService {
  constructor(
    private readonly documentService: DocumentService,
    private readonly assetService: AssetService,
  ) {}

  async uploadAssetDocument(
    assetId: string,
    file: Express.Multer.File,
    createDocumentDto: CreateDocumentDto,
    userId: string,
  ) {
    // Verify asset exists
    const asset = await this.assetService.findById(assetId);
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    // Upload document with asset association
    const document = await this.documentService.uploadDocument(
      {
        ...createDocumentDto,
        assetId,
      },
      file,
      userId,
    );

    return document;
  }
}
```

### 4. Auto-Generate Document Types Based on Asset Category

```typescript
const DOCUMENT_TYPE_BY_CATEGORY = {
  'Electronics': ['manual', 'warranty', 'certificate'],
  'Furniture': ['receipt', 'warranty'],
  'Software': ['license', 'certificate'],
  'Vehicles': ['maintenance', 'receipt', 'certificate'],
};

// When uploading, suggest document types based on asset category
export function getSuggestedDocumentTypes(assetCategory: string): DocumentType[] {
  return DOCUMENT_TYPE_BY_CATEGORY[assetCategory] || ['other'];
}
```

### 5. Asset Transfer with Documents

When an asset is transferred, consider updating document permissions:

```typescript
@Injectable()
export class AssetTransferService {
  constructor(
    private readonly documentService: DocumentService,
    private readonly assetTransferService: AssetTransferService,
  ) {}

  async transferAssetWithDocuments(
    assetId: string,
    newOwnerId: string,
    currentUserId: string,
  ) {
    // Transfer asset
    const transfer = await this.assetTransferService.transferAsset(
      assetId,
      newOwnerId,
      currentUserId,
    );

    // Update document permissions for asset
    const documents = await this.documentService.getDocumentsByAsset(assetId, currentUserId);

    for (const doc of documents) {
      // Grant view and download permission to new owner
      await this.documentService.grantAccess(
        doc.id,
        {
          userId: newOwnerId,
          permissions: ['view', 'download'],
        },
        currentUserId,
      );
    }

    return transfer;
  }
}
```

### 6. Asset Disposal with Document Archiving

When an asset is disposed, archive its documents:

```typescript
@Injectable()
export class AssetDisposalService {
  constructor(
    private readonly documentService: DocumentService,
    private readonly assetService: AssetService,
  ) {}

  async disposeAsset(assetId: string, userId: string) {
    // Dispose asset
    const disposal = await this.assetService.disposeAsset(assetId, userId);

    // Archive all associated documents
    const documents = await this.documentService.getDocumentsByAsset(assetId, userId);

    const bulkAction = {
      documentIds: documents.map((d) => d.id),
      action: 'archive' as const,
    };

    await this.documentService.bulkAction(bulkAction, userId);

    return disposal;
  }
}
```

## Usage Patterns

### Pattern 1: Complete Asset with Documents

Create an asset along with its documentation:

```typescript
@Injectable()
export class CompleteAssetService {
  constructor(
    private readonly assetService: AssetService,
    private readonly documentService: DocumentService,
  ) {}

  async createAssetWithDocuments(
    assetData: CreateAssetDto,
    files: Express.Multer.File[],
    userId: string,
  ) {
    // Create asset
    const asset = await this.assetService.create(assetData, userId);

    // Upload documents
    const documents = await Promise.all(
      files.map((file) =>
        this.documentService.uploadDocument(
          {
            assetId: asset.id,
            documentType: this.inferDocumentType(file.originalname),
            name: file.originalname,
            accessLevel: 'organization',
          },
          file,
          userId,
        ),
      ),
    );

    return {
      asset,
      documents,
    };
  }

  private inferDocumentType(fileName: string): DocumentType {
    const ext = fileName.toLowerCase().split('.').pop();
    const typeMap = {
      'pdf': 'manual',
      'jpg': 'photo',
      'png': 'photo',
      'docx': 'certificate',
    };
    return (typeMap[ext] || 'other') as DocumentType;
  }
}
```

### Pattern 2: Bulk Document Import

Import documents for multiple assets:

```typescript
@Injectable()
export class BulkDocumentImportService {
  constructor(
    private readonly documentService: DocumentService,
    private readonly assetService: AssetService,
  ) {}

  async importDocumentsFromCSV(csvData: string, userId: string) {
    const records = this.parseCSV(csvData);
    const results = [];

    for (const record of records) {
      try {
        // Verify asset exists
        const asset = await this.assetService.findBySerialNumber(record.assetSerial);
        if (!asset) {
          results.push({
            assetSerial: record.assetSerial,
            status: 'failed',
            reason: 'Asset not found',
          });
          continue;
        }

        // Create document record
        const document = await this.documentService.uploadDocument(
          {
            assetId: asset.id,
            documentType: record.documentType as DocumentType,
            name: record.documentName,
            description: record.description,
            accessLevel: record.accessLevel as AccessLevel,
            tags: record.tags,
          },
          record.file,
          userId,
        );

        results.push({
          assetSerial: record.assetSerial,
          status: 'success',
          documentId: document.id,
        });
      } catch (error) {
        results.push({
          assetSerial: record.assetSerial,
          status: 'failed',
          reason: error.message,
        });
      }
    }

    return results;
  }

  private parseCSV(csvData: string) {
    // Implementation of CSV parsing
    return [];
  }
}
```

### Pattern 3: Document Expiration Alerts

Alert users about expiring documents:

```typescript
@Cron('0 0 * * *') // Daily at midnight
async checkExpiringDocuments() {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringDocs = await this.documentRepository.find({
    where: {
      expirationDate: LessThanOrEqual(thirtyDaysFromNow),
      isActive: true,
    },
  });

  for (const doc of expiringDocs) {
    // Send notification to asset owner
    await this.notificationService.sendExpirationAlert(doc);
  }
}
```

### Pattern 4: Document Compliance Reports

Generate compliance reports with documents:

```typescript
@Injectable()
export class ComplianceReportService {
  constructor(
    private readonly documentService: DocumentService,
    private readonly assetService: AssetService,
  ) {}

  async generateAssetComplianceReport(assetId: string, userId: string) {
    const asset = await this.assetService.findById(assetId);
    const documents = await this.documentService.getDocumentsByAsset(assetId, userId);

    const requiredDocuments = {
      invoice: documents.some((d) => d.documentType === 'invoice'),
      warranty: documents.some((d) => d.documentType === 'warranty'),
      certificate: documents.some((d) => d.documentType === 'certificate'),
    };

    const compliance = {
      assetId,
      assetName: asset.name,
      compliant: Object.values(requiredDocuments).every((v) => v),
      requiredDocuments,
      availableDocuments: documents.length,
      lastDocumentUpdate: documents[0]?.updatedAt,
    };

    return compliance;
  }
}
```

## Database Relationships

```sql
-- Asset and Document Relationship
SELECT 
  a.id as asset_id,
  a.name as asset_name,
  d.id as document_id,
  d.name as document_name,
  d.documentType,
  COUNT(*) OVER (PARTITION BY a.id) as total_documents
FROM documents d
INNER JOIN assets a ON d.assetId = a.id
WHERE a.isActive = true
ORDER BY a.id, d.createdAt DESC;

-- Document Statistics by Asset
SELECT
  a.id,
  a.name,
  COUNT(d.id) as document_count,
  SUM(d.fileSize) as total_size,
  MAX(d.updatedAt) as last_updated
FROM assets a
LEFT JOIN documents d ON a.id = d.assetId
WHERE a.isActive = true
GROUP BY a.id, a.name
ORDER BY document_count DESC;
```

## API Integration Examples

### Fetch Asset with Documents

```typescript
// Frontend example
async function fetchAssetWithDocuments(assetId: string) {
  const [asset, documents] = await Promise.all([
    fetch(`/api/assets/${assetId}`).then((r) => r.json()),
    fetch(`/api/documents/asset/${assetId}/documents`).then((r) => r.json()),
  ]);

  return {
    ...asset,
    documents,
  };
}
```

### Upload Multiple Documents for Asset

```typescript
async function uploadAssetDocuments(
  assetId: string,
  files: File[],
  token: string,
) {
  const results = await Promise.all(
    files.map((file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('assetId', assetId);
      formData.append('documentType', inferType(file.name));
      formData.append('name', file.name);

      return fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }).then((r) => r.json());
    }),
  );

  return results;
}

function inferType(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const typeMap = {
    pdf: 'manual',
    jpg: 'photo',
    png: 'photo',
  };
  return typeMap[ext] || 'other';
}
```

## Permissions and Security

### Document Permissions Based on Asset Access

```typescript
// When granting asset access, also consider documents
async function grantAssetAccess(
  assetId: string,
  userId: string,
  permissions: string[],
) {
  // Grant asset access
  await assetService.grantAccess(assetId, userId, permissions);

  // Grant document access if asset access is granted
  if (permissions.includes('view')) {
    const documents = await documentService.getDocumentsByAsset(assetId);

    for (const doc of documents) {
      await documentService.grantAccess(
        doc.id,
        {
          userId,
          permissions: ['view', 'download'],
        },
        currentUserId,
      );
    }
  }
}
```

## Best Practices

1. **Validate Asset Existence**: Always verify the asset exists before uploading documents
2. **Consistent Permissions**: Keep document permissions aligned with asset ownership
3. **Regular Cleanup**: Archive documents for disposed assets
4. **Metadata Utilization**: Use metadata to store asset-specific document information
5. **Audit Tracking**: Monitor document access for sensitive documents
6. **Version Management**: Keep previous versions for audit and compliance
7. **Storage Management**: Implement policies to clean up old versions
8. **Performance**: Use pagination for large document lists

## Troubleshooting

### Documents Not Appearing

```typescript
// Check if asset exists
const asset = await assetService.findById(assetId);

// Check document permissions
const userPermissions = await documentService.checkPermission(
  documentId,
  userId,
  'view',
);

// Check if document is archived
const document = await documentService.getDocument(documentId, userId);
console.log('Is archived:', document.isArchived);
```

### Permission Issues

```typescript
// Debug permission chain
const doc = await documentService.getDocument(docId, userId);
const perms = await documentService.getDocumentPermissions(docId, userId);
console.log('Doc owner:', doc.createdBy);
console.log('Current user:', userId);
console.log('Explicit perms:', perms);
```

## Migration from Legacy Systems

See [CONFIGURATION.md](./CONFIGURATION.md#migration-from-other-systems) for detailed migration instructions.
