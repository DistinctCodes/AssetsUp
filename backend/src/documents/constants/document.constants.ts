/**
 * Document Management System - Constants
 * Defines all constants, enums, and configurations used throughout the system
 */

// File size constants
export const FILE_SIZE_CONSTANTS = {
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
  MIN_FILE_SIZE: 1, // 1 byte
};

// Allowed MIME types
export const ALLOWED_MIME_TYPES = {
  PDF: 'application/pdf',
  IMAGE_JPEG: 'image/jpeg',
  IMAGE_PNG: 'image/png',
  IMAGE_GIF: 'image/gif',
  IMAGE_WEBP: 'image/webp',
  WORD_DOC: 'application/msword',
  WORD_DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  EXCEL_XLS: 'application/vnd.ms-excel',
  EXCEL_XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  POWERPOINT_PPT: 'application/vnd.ms-powerpoint',
  POWERPOINT_PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ZIP: 'application/zip',
  RAR: 'application/x-rar-compressed',
  GZIP: 'application/gzip',
  TEXT_PLAIN: 'text/plain',
  TEXT_CSV: 'text/csv',
  TEXT_HTML: 'text/html',
  APPLICATION_JSON: 'application/json',
};

// Document type labels
export const DOCUMENT_TYPE_LABELS = {
  invoice: 'Invoice',
  warranty: 'Warranty',
  manual: 'Manual',
  photo: 'Photo',
  receipt: 'Receipt',
  certificate: 'Certificate',
  maintenance: 'Maintenance Record',
  license: 'License',
  other: 'Other',
};

// Access level labels
export const ACCESS_LEVEL_LABELS = {
  private: 'Private (Owner Only)',
  department: 'Department',
  organization: 'Organization Wide',
  public: 'Public',
};

// Permission labels
export const PERMISSION_LABELS = {
  view: 'View',
  download: 'Download',
  edit: 'Edit',
  delete: 'Delete',
  share: 'Share',
};

// Default access level
export const DEFAULT_ACCESS_LEVEL = 'organization';

// Pagination defaults
export const PAGINATION_DEFAULTS = {
  LIMIT: 20,
  MAX_LIMIT: 100,
  OFFSET: 0,
};

// Audit log retention
export const AUDIT_LOG_RETENTION = {
  DAYS: 365, // 1 year
  MONTHS: 12,
};

// File extension mapping
export const FILE_EXTENSION_MAP = {
  '.pdf': ALLOWED_MIME_TYPES.PDF,
  '.jpg': ALLOWED_MIME_TYPES.IMAGE_JPEG,
  '.jpeg': ALLOWED_MIME_TYPES.IMAGE_JPEG,
  '.png': ALLOWED_MIME_TYPES.IMAGE_PNG,
  '.gif': ALLOWED_MIME_TYPES.IMAGE_GIF,
  '.webp': ALLOWED_MIME_TYPES.IMAGE_WEBP,
  '.doc': ALLOWED_MIME_TYPES.WORD_DOC,
  '.docx': ALLOWED_MIME_TYPES.WORD_DOCX,
  '.xls': ALLOWED_MIME_TYPES.EXCEL_XLS,
  '.xlsx': ALLOWED_MIME_TYPES.EXCEL_XLSX,
  '.ppt': ALLOWED_MIME_TYPES.POWERPOINT_PPT,
  '.pptx': ALLOWED_MIME_TYPES.POWERPOINT_PPTX,
  '.zip': ALLOWED_MIME_TYPES.ZIP,
  '.rar': ALLOWED_MIME_TYPES.RAR,
  '.gz': ALLOWED_MIME_TYPES.GZIP,
  '.txt': ALLOWED_MIME_TYPES.TEXT_PLAIN,
  '.csv': ALLOWED_MIME_TYPES.TEXT_CSV,
  '.html': ALLOWED_MIME_TYPES.TEXT_HTML,
  '.json': ALLOWED_MIME_TYPES.APPLICATION_JSON,
};

// Document type by category
export const DOCUMENT_TYPE_BY_CATEGORY = {
  Electronics: ['manual', 'warranty', 'certificate', 'receipt'],
  Furniture: ['receipt', 'warranty', 'certificate'],
  Software: ['license', 'certificate', 'manual'],
  Vehicles: ['maintenance', 'receipt', 'certificate', 'manual'],
  Office_Equipment: ['manual', 'warranty', 'maintenance', 'certificate'],
  Tools: ['receipt', 'warranty'],
  Other: ['other'],
};

// Error messages
export const ERROR_MESSAGES = {
  FILE_NOT_PROVIDED: 'No file provided',
  FILE_NOT_FOUND: 'File not found on server',
  FILE_TOO_LARGE: 'File size exceeds maximum allowed size',
  FILE_TOO_SMALL: 'File size is too small',
  INVALID_MIME_TYPE: 'Invalid file type',
  INVALID_FILE_NAME: 'Invalid file name',
  DOCUMENT_NOT_FOUND: 'Document not found',
  ASSET_NOT_FOUND: 'Associated asset not found',
  PERMISSION_DENIED: 'You do not have permission to access this resource',
  PERMISSION_EXPIRED: 'Access permission has expired',
  INVALID_PERMISSION: 'Invalid permission type',
  INVALID_ACCESS_LEVEL: 'Invalid access level',
  CHECKSUM_MISMATCH: 'File integrity verification failed',
  UPLOAD_FAILED: 'Document upload failed',
  UPDATE_FAILED: 'Document update failed',
  DELETE_FAILED: 'Document deletion failed',
  VERSION_NOT_FOUND: 'Document version not found',
  STORAGE_ERROR: 'Storage system error',
};

// Success messages
export const SUCCESS_MESSAGES = {
  DOCUMENT_UPLOADED: 'Document uploaded successfully',
  DOCUMENT_UPDATED: 'Document updated successfully',
  DOCUMENT_DELETED: 'Document deleted successfully',
  DOCUMENT_ARCHIVED: 'Document archived successfully',
  DOCUMENT_UNARCHIVED: 'Document unarchived successfully',
  VERSION_RESTORED: 'Document version restored successfully',
  ACCESS_GRANTED: 'Access granted successfully',
  ACCESS_UPDATED: 'Access permissions updated successfully',
  ACCESS_REVOKED: 'Access revoked successfully',
  BULK_ACTION_COMPLETED: 'Bulk action completed successfully',
};

// API endpoints
export const API_ENDPOINTS = {
  UPLOAD: '/documents/upload',
  LIST: '/documents',
  GET: '/documents/:id',
  UPDATE: '/documents/:id',
  DELETE: '/documents/:id',
  ARCHIVE: '/documents/:id/archive',
  UNARCHIVE: '/documents/:id/unarchive',
  VERSIONS: '/documents/:id/versions',
  VERSION_GET: '/documents/:id/versions/:version',
  VERSION_RESTORE: '/documents/:id/versions/:version/restore',
  DOWNLOAD: '/documents/:id/download',
  VERSION_DOWNLOAD: '/documents/:id/versions/:version/download',
  PERMISSIONS_GRANT: '/documents/:id/permissions/grant',
  PERMISSIONS_GET: '/documents/:id/permissions',
  PERMISSIONS_UPDATE: '/documents/:id/permissions/:userId',
  PERMISSIONS_REVOKE: '/documents/:id/permissions/:userId',
  ASSET_DOCUMENTS: '/documents/asset/:assetId/documents',
  BULK_ACTION: '/documents/bulk-action',
  AUDIT_LOGS_DOCUMENT: '/documents/:id/audit-logs',
  AUDIT_LOGS_USER: '/documents/audit-logs/user/:userId',
  AUDIT_LOGS_ACTION: '/documents/audit-logs/action/:actionType',
};

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Rate limiting
export const RATE_LIMITING = {
  UPLOADS_PER_MINUTE: 10,
  DOWNLOADS_PER_MINUTE: 30,
  SEARCHES_PER_MINUTE: 60,
  API_CALLS_PER_MINUTE: 100,
};

// Cache settings
export const CACHE_SETTINGS = {
  DOCUMENT_TTL: 5 * 60, // 5 minutes
  LIST_TTL: 2 * 60, // 2 minutes
  PERMISSION_TTL: 10 * 60, // 10 minutes
};

// Document statuses
export const DOCUMENT_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
  EXPIRED: 'expired',
};

// Search filters
export const SEARCH_FILTERS = {
  BY_NAME: 'name',
  BY_TYPE: 'documentType',
  BY_ASSET: 'assetId',
  BY_ACCESS_LEVEL: 'accessLevel',
  BY_TAGS: 'tags',
  BY_DATE_RANGE: 'dateRange',
  BY_CREATOR: 'createdBy',
};

// Sort options
export const SORT_OPTIONS = {
  CREATED_ASC: 'createdAt_asc',
  CREATED_DESC: 'createdAt_desc',
  UPDATED_ASC: 'updatedAt_asc',
  UPDATED_DESC: 'updatedAt_desc',
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  SIZE_ASC: 'fileSize_asc',
  SIZE_DESC: 'fileSize_desc',
};

// Upload directory structure
export const UPLOAD_STRUCTURE = {
  BASE: './uploads/documents',
  TEMP: './uploads/documents/temp',
  ARCHIVE: './uploads/documents/archive',
};

// Validation rules
export const VALIDATION_RULES = {
  DOCUMENT_NAME_MAX_LENGTH: 255,
  DESCRIPTION_MAX_LENGTH: 1000,
  TAGS_MAX_LENGTH: 500,
  TAG_MAX_COUNT: 10,
  CHANGE_LOG_MAX_LENGTH: 500,
};

// Event types for document operations
export const DOCUMENT_EVENTS = {
  UPLOADED: 'document.uploaded',
  UPDATED: 'document.updated',
  DELETED: 'document.deleted',
  ACCESSED: 'document.accessed',
  DOWNLOADED: 'document.downloaded',
  ARCHIVED: 'document.archived',
  UNARCHIVED: 'document.unarchived',
  PERMISSION_CHANGED: 'document.permission.changed',
  EXPIRATION_APPROACHING: 'document.expiration.approaching',
  EXPIRATION_REACHED: 'document.expiration.reached',
};

// Document metadata keys
export const DOCUMENT_METADATA_KEYS = {
  VENDOR: 'vendor',
  SERIAL_NUMBER: 'serialNumber',
  PURCHASE_DATE: 'purchaseDate',
  WARRANTY_EXPIRY: 'warrantyExpiry',
  COST: 'cost',
  CURRENCY: 'currency',
  REFERENCE_NUMBER: 'referenceNumber',
  CUSTOM_FIELD_1: 'customField1',
  CUSTOM_FIELD_2: 'customField2',
  CUSTOM_FIELD_3: 'customField3',
};

// Default metadata template
export const DEFAULT_METADATA_TEMPLATES = {
  invoice: {
    vendor: '',
    invoiceNumber: '',
    invoiceDate: null,
    amount: 0,
    currency: 'USD',
  },
  warranty: {
    warrantyStart: null,
    warrantyEnd: null,
    provider: '',
    coverageType: '',
  },
  manual: {
    language: 'English',
    pages: 0,
  },
  certificate: {
    certificateNumber: '',
    issueDate: null,
    expiryDate: null,
    issuer: '',
  },
};

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_COMPRESSION: false,
  ENABLE_ENCRYPTION: false,
  ENABLE_PREVIEW: false,
  ENABLE_OCR: false,
  ENABLE_CLOUD_STORAGE: false,
  ENABLE_VERSIONING: true,
  ENABLE_AUDIT_LOGGING: true,
};

// Export all constants as a single object
export const DOCUMENT_CONSTANTS = {
  FILE_SIZE_CONSTANTS,
  ALLOWED_MIME_TYPES,
  DOCUMENT_TYPE_LABELS,
  ACCESS_LEVEL_LABELS,
  PERMISSION_LABELS,
  DEFAULT_ACCESS_LEVEL,
  PAGINATION_DEFAULTS,
  AUDIT_LOG_RETENTION,
  FILE_EXTENSION_MAP,
  DOCUMENT_TYPE_BY_CATEGORY,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  API_ENDPOINTS,
  HTTP_STATUS,
  RATE_LIMITING,
  CACHE_SETTINGS,
  DOCUMENT_STATUS,
  SEARCH_FILTERS,
  SORT_OPTIONS,
  UPLOAD_STRUCTURE,
  VALIDATION_RULES,
  DOCUMENT_EVENTS,
  DOCUMENT_METADATA_KEYS,
  DEFAULT_METADATA_TEMPLATES,
  FEATURE_FLAGS,
};
