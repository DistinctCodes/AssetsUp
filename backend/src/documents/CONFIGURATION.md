# Document Management System Configuration

## Environment Variables

Create a `.env` file in the backend root directory with the following configurations:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=manage_assets
DB_SYNCHRONIZE=true
NODE_ENV=development

# Document Storage
UPLOAD_DIR=./uploads/documents
MAX_FILE_SIZE=524288000

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=24h

# Server Configuration
PORT=3000
API_PREFIX=api

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# File Upload Configuration
ALLOWED_MIME_TYPES=application/pdf,image/jpeg,image/png,image/gif,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

# Audit Configuration
ENABLE_AUDIT_LOGGING=true
AUDIT_LOG_RETENTION_DAYS=365

# Storage Configuration
ENABLE_FILE_COMPRESSION=false
ENABLE_FILE_ENCRYPTION=false
ENCRYPTION_KEY=your_encryption_key

# Feature Flags
ENABLE_DOCUMENT_PREVIEW=false
ENABLE_OCR=false
ENABLE_CLOUD_STORAGE=false
```

## Database Setup

### 1. Create Tables

The tables are automatically created by TypeORM synchronization when `DB_SYNCHRONIZE=true`.

Tables created:
- `documents`
- `document_versions`
- `document_access_permissions`
- `document_audit_logs`

### 2. Create Indexes

Indexes are automatically created during table synchronization.

### 3. Initial Data

No initial data is required. The system is ready to use once tables are created.

## Application Setup

### 1. Installation

```bash
cd backend
npm install
```

### 2. Database Migration

```bash
# For development with synchronize: true
npm run start:dev

# For production with migrations
npm run migration:run
```

### 3. Start Server

```bash
# Development with watch mode
npm run start:dev

# Production build and run
npm run build
npm run start:prod
```

## Module Integration

The DocumentsModule is already integrated into the AppModule. No additional setup is needed.

To verify integration:

1. Check [app.module.ts](app.module.ts) imports the DocumentsModule
2. Verify all entities are included in TypeOrmModule.forRoot()
3. Confirm DocumentsModule is exported from documents module

## API Documentation

Once the server is running, access the Swagger documentation at:

```
http://localhost:3000/api/docs
```

## Testing

### Manual Testing with cURL

```bash
# 1. Upload a document
curl -X POST http://localhost:3000/documents/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test-file.pdf" \
  -F "assetId=550e8400-e29b-41d4-a716-446655440000" \
  -F "documentType=invoice" \
  -F "name=Test Invoice"

# 2. List documents
curl -X GET "http://localhost:3000/documents?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 3. Get document details
curl -X GET http://localhost:3000/documents/DOC_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 4. Download document
curl -X GET http://localhost:3000/documents/DOC_ID/download \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o downloaded-file.pdf

# 5. Grant access
curl -X POST http://localhost:3000/documents/DOC_ID/permissions/grant \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "permissions": ["view", "download"],
    "expiresAt": "2025-12-31"
  }'
```

## Troubleshooting

### Issue: Upload Directory Not Found

**Solution:** Ensure the `UPLOAD_DIR` exists or is accessible:

```bash
mkdir -p ./uploads/documents
chmod 755 ./uploads/documents
```

### Issue: File Size Limit Exceeded

**Solution:** Increase `MAX_FILE_SIZE` in environment variables:

```env
MAX_FILE_SIZE=1073741824  # 1GB
```

### Issue: Permission Denied on File Operations

**Solution:** Ensure proper file permissions:

```bash
chmod -R 755 ./uploads
```

### Issue: Database Connection Failed

**Solution:** Verify database configuration:

```bash
# Test connection
psql -h localhost -U postgres -d manage_assets
```

### Issue: JWT Token Errors

**Solution:** Ensure JWT_SECRET is configured and token is valid:

```env
JWT_SECRET=your_secure_secret_key
JWT_EXPIRATION=24h
```

## Performance Optimization

### 1. File Storage

- Use SSD for upload directory
- Implement file cleanup policies
- Consider cloud storage integration (S3, Azure Blob)

### 2. Database

- Add indexes for frequently searched columns
- Implement partitioning for audit logs
- Regular maintenance and vacuuming

### 3. API

- Implement caching for frequently accessed documents
- Use pagination for list operations
- Compress responses

### 4. Monitoring

- Monitor disk usage
- Track API response times
- Log error rates

## Security Hardening

### 1. File Upload

```typescript
// Implement in upload validation
- Validate file type via magic bytes, not just extension
- Scan uploaded files for malware
- Implement rate limiting
```

### 2. Access Control

```typescript
// Already implemented features:
- Permission-based access control
- User identity verification
- Audit logging of all access
- Permission expiration
```

### 3. Data Protection

```typescript
// Recommended additions:
- Encrypt sensitive files at rest
- Use HTTPS for all communications
- Implement TLS/SSL
- Use secure headers
```

## Backup and Recovery

### 1. File Backup

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
tar -czf /backups/documents_$DATE.tar.gz ./uploads/documents
```

### 2. Database Backup

```bash
# PostgreSQL backup
pg_dump -h localhost -U postgres manage_assets | gzip > backup_$(date +%Y%m%d).sql.gz
```

### 3. Recovery Procedure

```bash
# Restore files
tar -xzf /backups/documents_$DATE.tar.gz -C ./

# Restore database
gunzip < backup_$DATE.sql.gz | psql -h localhost -U postgres manage_assets
```

## Monitoring and Logging

### 1. Application Logs

Logs are output to console in development and file in production.

### 2. Audit Logs

Query audit logs via API:

```bash
curl -X GET "http://localhost:3000/documents/DOC_ID/audit-logs" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Error Monitoring

Configure error tracking service (Sentry, DataDog):

```typescript
import * as Sentry from "@sentry/node";

// In main.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
});
```

## Migration from Other Systems

### 1. Prepare Data

```sql
-- Create temporary table
CREATE TABLE temp_documents (
  asset_id UUID,
  file_path VARCHAR,
  document_type VARCHAR,
  name VARCHAR,
  description TEXT
);

-- Import from CSV
COPY temp_documents FROM 'documents.csv' WITH (FORMAT csv);
```

### 2. Transform and Load

```typescript
// Use DocumentService to import
// Handle file migration to new storage system
```

### 3. Verification

```bash
# Verify document count
curl -X GET "http://localhost:3000/documents?limit=1000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  | jq '.total'
```

## Future Enhancements

- [ ] Cloud storage integration (S3, Azure, GCS)
- [ ] Full-text search with Elasticsearch
- [ ] Document preview generation
- [ ] OCR capability
- [ ] E-signature integration
- [ ] Workflow approvals
- [ ] Advanced analytics
- [ ] Mobile app sync
- [ ] Real-time collaboration
- [ ] Advanced version comparison

## Support and Documentation

- API Documentation: http://localhost:3000/api/docs
- Module README: [./README.md](./README.md)
- Source Code: [./src](./src)
- Entity Definitions: [./entities](./entities)
- DTOs: [./dto](./dto)
- Services: [./services](./services)
- Controllers: [./controllers](./controllers)
