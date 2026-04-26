# File Upload Service

Simple file upload service for storing asset images and documents.

## Features

- Upload single or multiple files
- Automatic file validation (MIME type and size)
- Secure file storage with UUID naming
- Download and delete file support
- Security checks to prevent path traversal
- Support for images (JPEG, PNG, GIF, WebP) and documents (PDF, DOC, XLS, etc.)

## Supported File Types

### Images
- image/jpeg
- image/png
- image/gif
- image/webp

### Documents
- application/pdf
- application/msword
- application/vnd.openxmlformats-officedocument.wordprocessingml.document
- application/vnd.ms-excel
- application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

## Constraints

- **Max file size:** 10MB
- **Max files per upload:** 5

## API Endpoints

### Upload Single File
**POST** `/api/upload/file`
- Form data: `file` (single file)
- Response: `UploadResponseDto`

### Upload Multiple Files
**POST** `/api/upload/files`
- Form data: `files` (up to 5 files)
- Response: `UploadResponseDto[]`

### Download File
**GET** `/api/upload/:filename`
- Param: `filename` (UUID-based filename)
- Response: File binary

### Delete File
**DELETE** `/api/upload/:filename`
- Param: `filename` (UUID-based filename)
- Response: Success

## Response Format

```json
{
  "filename": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6.jpg",
  "path": "/path/to/uploads/a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6.jpg",
  "size": 102400,
  "mimetype": "image/jpeg",
  "url": "/uploads/a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6.jpg"
}
```

## Usage in Other Modules

Import `UploadModule` in your module:

```typescript
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [UploadModule],
})
export class AssetsModule {}
```

Inject `UploadService` in your service:

```typescript
constructor(private uploadService: UploadService) {}

// Upload a file
const response = await this.uploadService.uploadFile(file);
```

## Security Features

- File validation by MIME type and size
- UUID-based filename generation (prevents direct access)
- Path traversal protection checks
- Automatic uploads directory creation
