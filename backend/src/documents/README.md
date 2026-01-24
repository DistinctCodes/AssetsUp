# Document Management System

The Document Management System is a comprehensive module for uploading, storing, and managing asset-related files such as invoices, warranties, manuals, photos, and other documents with built-in version control and access control mechanisms.

## Features

### Core Capabilities

1. **Document Upload & Storage**
   - Upload files up to 500MB
   - Automatic file path generation with checksums
   - Support for multiple document types (invoice, warranty, manual, photo, receipt, certificate, maintenance, license, custom)
   - Metadata storage for custom attributes

2. **Version Control**
   - Automatic version tracking for all document updates
   - Full revision history with change logs
   - Version restore functionality
   - Checksum-based integrity verification

3. **Access Control**
   - Role-based access permissions (view, download, edit, delete, share)
   - Multiple access levels (private, department, organization, public)
   - User-level permission management
   - Permission expiration support
   - Granular permission configuration per user

4. **Asset Integration**
   - Documents linked to assets
   - Multi-document per asset support
   - Document search and filtering by asset
   - Batch operations on document collections

5. **Audit & Compliance**
   - Comprehensive audit logging for all operations
   - Action tracking (created, updated, accessed, downloaded, etc.)
   - User and timestamp recording
   - IP address and user agent capture
   - Full audit history retrieval

6. **Search & Organization**
   - Full-text search across document names and descriptions
   - Filter by document type, access level, asset, tags
   - Pagination support
   - Tag-based organization
   - Document archiving capability

## Data Model

### Entities

#### Document
Main entity representing a stored document.

```typescript
{
  id: UUID;
  assetId: UUID;
  documentType: DocumentType; // invoice, warranty, manual, photo, etc.
  name: string;
  description?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  accessLevel: DocumentAccessLevel;
  isActive: boolean;
  currentVersion: number;
  tags?: string;
  expirationDate?: Date;
  createdBy: UUID;
  createdAt: Date;
  updatedBy?: UUID;
  updatedAt: Date;
  isArchived: boolean;
  archivedAt?: Date;
  metadata: Record<string, any>;
  checksum: string;
}
```

#### DocumentVersion
Tracks all versions of a document for version control.

```typescript
{
  id: UUID;
  documentId: UUID;
  version: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  changeLog?: string;
  uploadedBy: UUID;
  uploadedAt: Date;
  checksum: string;
  metadata: Record<string, any>;
}
```

#### DocumentAccessPermission
Manages granular access permissions for documents.

```typescript
{
  id: UUID;
  documentId: UUID;
  userId: UUID;
  permissions: DocumentPermissionType[]; // view, download, edit, delete, share
  grantedBy: UUID;
  grantedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}
```

#### DocumentAuditLog
Comprehensive audit trail for all document operations.

```typescript
{
  id: UUID;
  documentId: UUID;
  userId?: UUID;
  actionType: DocumentAuditActionType; // created, updated, accessed, etc.
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}
```

## API Endpoints

### Document Operations

#### Upload Document
```
POST /documents/upload
Content-Type: multipart/form-data

Parameters:
- file: File (required)
- assetId: UUID (required)
- documentType: DocumentType (required)
- name: string (required)
- description?: string
- accessLevel?: DocumentAccessLevel (default: organization)
- expirationDate?: Date
- tags?: string
- metadata?: Record<string, any>
```

#### List Documents
```
GET /documents?query=search&documentType=invoice&accessLevel=organization&assetId=uuid&tags=tag&limit=20&offset=0

Query Parameters:
- query?: string (search in name and description)
- documentType?: DocumentType
- accessLevel?: DocumentAccessLevel
- assetId?: UUID
- tags?: string
- limit?: number (default: 20)
- offset?: number (default: 0)
```

#### Get Document Details
```
GET /documents/:id
```

#### Update Document
```
PUT /documents/:id
Content-Type: multipart/form-data

Parameters:
- file?: File (optional, creates new version if provided)
- name?: string
- description?: string
- accessLevel?: DocumentAccessLevel
- expirationDate?: Date
- tags?: string
- changeLog?: string (description of changes)
```

#### Delete Document
```
DELETE /documents/:id
```

#### Archive Document
```
PUT /documents/:id/archive
```

#### Unarchive Document
```
PUT /documents/:id/unarchive
```

### Version Control

#### Get All Versions
```
GET /documents/:id/versions
```

#### Get Specific Version
```
GET /documents/:id/versions/:version
```

#### Restore Version
```
POST /documents/:id/versions/:version/restore
```

#### Download Document
```
GET /documents/:id/download
```

#### Download Specific Version
```
GET /documents/:id/versions/:version/download
```

### Access Control

#### Grant Access
```
POST /documents/:id/permissions/grant

Body:
{
  userId: UUID,
  permissions: string[], // ['view', 'download']
  expiresAt?: Date
}
```

#### Get Document Permissions
```
GET /documents/:id/permissions
```

#### Update User Permissions
```
PUT /documents/:id/permissions/:userId

Body:
{
  permissions: string[],
  expiresAt?: Date
}
```

#### Revoke Access
```
DELETE /documents/:id/permissions/:userId
```

### Asset Operations

#### Get Asset Documents
```
GET /documents/asset/:assetId/documents
```

### Bulk Operations

#### Bulk Action
```
POST /documents/bulk-action

Body:
{
  documentIds: UUID[],
  action: 'archive' | 'unarchive' | 'delete' | 'changeAccessLevel',
  accessLevel?: DocumentAccessLevel (required for changeAccessLevel action)
}
```

### Audit Logs

#### Get Document Audit Logs
```
GET /documents/:id/audit-logs?limit=100&offset=0
```

#### Get User Audit Logs
```
GET /documents/audit-logs/user/:userId?limit=100&offset=0
```

#### Get Audit Logs by Action Type
```
GET /documents/audit-logs/action/:actionType?limit=100&offset=0
```

## Permission System

### Permission Types

- **view**: Read access to document metadata
- **download**: Download file content
- **edit**: Update document details and create new versions
- **delete**: Permanently delete document
- **share**: Grant or revoke access to other users

### Access Levels

- **private**: Only document owner
- **department**: Department members
- **organization**: All organization members
- **public**: Anyone with link

## Usage Examples

### Upload a Document
```bash
curl -X POST http://localhost:3000/documents/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@invoice.pdf" \
  -F "assetId=asset-uuid" \
  -F "documentType=invoice" \
  -F "name=Invoice for Asset" \
  -F "accessLevel=organization"
```

### Search Documents
```bash
curl -X GET "http://localhost:3000/documents?query=invoice&documentType=invoice&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Grant Access to User
```bash
curl -X POST http://localhost:3000/documents/doc-uuid/permissions/grant \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "permissions": ["view", "download"],
    "expiresAt": "2025-12-31"
  }'
```

### Download Document
```bash
curl -X GET http://localhost:3000/documents/doc-uuid/download \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o downloaded-file.pdf
```

## Configuration

### Environment Variables

```env
# Upload directory
UPLOAD_DIR=./uploads/documents

# File size limit (in bytes, default: 500MB)
MAX_FILE_SIZE=524288000

# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=manage_assets
```

## Security Considerations

1. **File Upload Validation**
   - Validate file types and sizes
   - Scan uploaded files for malware
   - Store files outside web root
   - Use unique file names

2. **Access Control**
   - Check permissions before file access
   - Validate user identity via JWT
   - Implement rate limiting
   - Log all access attempts

3. **Data Protection**
   - Use HTTPS for all communications
   - Encrypt sensitive metadata
   - Implement audit logging
   - Regular backups

4. **Integrity Verification**
   - Checksum validation on download
   - Version control for accountability
   - Immutable audit logs

## Integration with Assets

The document management system integrates seamlessly with the asset management system:

1. Documents are linked to specific assets
2. Asset deletion cascades to related documents
3. Asset transfer triggers document permission updates
4. Audit logs track asset-document relationships

## Database Schema

### Tables

- `documents` - Main document records
- `document_versions` - Version history
- `document_access_permissions` - Access control
- `document_audit_logs` - Audit trail

### Indexes

- `idx_documents_assetId_documentType` - Asset and type queries
- `idx_documents_createdBy` - Owner queries
- `idx_documents_accessLevel` - Access level filtering
- `idx_document_versions_documentId_version` - Version lookups
- `idx_document_access_permissions_documentId` - Permission lookups
- `idx_document_audit_logs_documentId_createdAt` - Audit log queries

## Best Practices

1. **Regular Backups**: Implement automated backups for document storage
2. **Access Review**: Periodically review and audit access permissions
3. **Document Organization**: Use tags and metadata for better organization
4. **Version Retention**: Keep limited versions to manage storage
5. **Expiration Dates**: Set expiration dates for time-sensitive documents
6. **Audit Monitoring**: Regularly review audit logs for suspicious activity
7. **File Cleanup**: Implement cleanup policies for archived documents

## Future Enhancements

1. Document preview/thumbnail generation
2. Full-text search with Elasticsearch
3. Document compression and deduplication
4. Workflow approvals for sensitive documents
5. E-signature integration
6. Document sharing with external users
7. Mobile app support
8. Document version comparison
9. OCR and text extraction
10. Integration with cloud storage services
